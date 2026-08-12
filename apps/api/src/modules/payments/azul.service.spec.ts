import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { AzulService } from './azul.service';
import axios from 'axios';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AzulService', () => {
  let service: AzulService;

  beforeEach(async () => {
    delete process.env.AZUL_AUTH1;
    delete process.env.AZUL_AUTH2;
    delete process.env.AZUL_MERCHANT_ID;
    process.env.AZUL_ENV = 'MOCK';

    const module: TestingModule = await Test.createTestingModule({
      providers: [AzulService],
    }).compile();

    service = module.get<AzulService>(AzulService);
  });

  afterEach(() => {
    delete process.env.AZUL_AUTH1;
    delete process.env.AZUL_AUTH2;
    delete process.env.AZUL_MERCHANT_ID;
  });

  it('processCardSaleWithTokenization devuelve aprobación mock con token', async () => {
    const res = await service.processCardSaleWithTokenization({
      cardNumber: '4111 1111 1111 1111',
      expiration: '1228',
      cvc: '123',
      cardHolder: 'Ana',
      amountCents: 100,
      itbisCents: 18,
      orderNumber: 'ORD-1',
    });

    expect(res.IsoCode).toBe('00');
    expect(res.DataVaultToken).toContain('MOCK-TOKEN');
    expect(res.CardNumber).toContain('1111');
    expect(res.CardBrand).toBe('VISA');
  });

  it('processTokenSale devuelve aprobación mock', async () => {
    const res = await service.processTokenSale({
      dataVaultToken: 'tok',
      dataVaultExpiration: '202812',
      amountCents: 1000,
      itbisCents: 180,
      orderNumber: 'ORD-2',
    });

    expect(res.IsoCode).toBe('00');
  });

  it('voidTransaction devuelve aprobación mock', async () => {
    const res = await service.voidTransaction('azul-1');
    expect(res.IsoCode).toBe('00');
  });

  it('isApproved solo acepta IsoCode 00', () => {
    expect(service.isApproved({ IsoCode: '00' } as any)).toBe(true);
    expect(service.isApproved({ IsoCode: '51' } as any)).toBe(false);
  });

  it('detecta la marca de la tarjeta', () => {
    const res = service.processCardSaleWithTokenization({
      cardNumber: '5500 0000 0000 0004',
      expiration: '1228',
      cvc: '123',
      cardHolder: 'Ana',
      amountCents: 100,
      itbisCents: 18,
      orderNumber: 'ORD-3',
    });
    res.then((r) => expect(r.CardBrand).toBe('MASTERCARD'));
  });

  it('lanza error de configuración si AZUL_ENV=PRODUCTION sin credenciales', async () => {
    process.env.AZUL_ENV = 'PRODUCTION';

    await expect(
      service.processTokenSale({
        dataVaultToken: 'tok',
        dataVaultExpiration: '202812',
        amountCents: 100,
        itbisCents: 18,
        orderNumber: 'ORD-4',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('detecta AMEX, DISCOVER y marcas desconocidas', async () => {
    const amex = await service.processCardSaleWithTokenization({
      cardNumber: '3400 0000 0000 009',
      expiration: '1228',
      cvc: '123',
      cardHolder: 'Ana',
      amountCents: 100,
      itbisCents: 18,
      orderNumber: 'ORD-5',
    });
    expect(amex.CardBrand).toBe('AMEX');

    const discover = await service.processCardSaleWithTokenization({
      cardNumber: '6011 0000 0000 0004',
      expiration: '1228',
      cvc: '123',
      cardHolder: 'Ana',
      amountCents: 100,
      itbisCents: 18,
      orderNumber: 'ORD-6',
    });
    expect(discover.CardBrand).toBe('DISCOVER');

    const unknown = await service.processCardSaleWithTokenization({
      cardNumber: '1000 0000 0000 0000',
      expiration: '1228',
      cvc: '123',
      cardHolder: 'Ana',
      amountCents: 100,
      itbisCents: 18,
      orderNumber: 'ORD-7',
    });
    expect(unknown.CardBrand).toBe('UNKNOWN');
  });

  describe('modo real con credenciales', () => {
    const dto = {
      cardNumber: '4111 1111 1111 1111',
      expiration: '1228',
      cvc: '123',
      cardHolder: 'Ana',
      amountCents: 100,
      itbisCents: 18,
      orderNumber: 'ORD-8',
    };

    const mockPost = () => {
      const post = jest.fn();
      mockedAxios.create.mockReturnValue({ post } as any);
      return post;
    };

    beforeEach(() => {
      process.env.AZUL_ENV = 'TESTING';
      process.env.AZUL_AUTH1 = 'auth1';
      process.env.AZUL_AUTH2 = 'auth2';
      process.env.AZUL_MERCHANT_ID = 'merchant-1';
    });

    afterEach(() => {
      mockedAxios.create.mockReset();
    });

    it('processCardSaleWithTokenization envía el payload al gateway', async () => {
      const post = mockPost();
      post.mockResolvedValue({
        data: { IsoCode: '00', DataVaultToken: 'TOK-123' },
      });

      const res = await service.processCardSaleWithTokenization(dto);

      expect(res.IsoCode).toBe('00');
      expect(post).toHaveBeenCalledWith(
        '/WebServices/JSON/default.aspx',
        expect.objectContaining({
          Channel: 'EC',
          CardNumber: '4111 1111 1111 1111',
          SaveToDataVault: '1',
        }),
      );
    });

    it('relanza el error del gateway en card sale', async () => {
      const post = mockPost();
      post.mockRejectedValue(new Error('gateway down'));

      await expect(
        service.processCardSaleWithTokenization(dto),
      ).rejects.toThrow('gateway down');
    });

    it('processTokenSale envía el token al gateway', async () => {
      const post = mockPost();
      post.mockResolvedValue({ data: { IsoCode: '00' } });

      const res = await service.processTokenSale({
        dataVaultToken: 'tok',
        dataVaultExpiration: '202812',
        amountCents: 1000,
        itbisCents: 180,
        orderNumber: 'ORD-9',
      });

      expect(res.IsoCode).toBe('00');
      expect(post).toHaveBeenCalledWith(
        '/WebServices/JSON/default.aspx',
        expect.objectContaining({
          DataVaultToken: 'tok',
          SaveToDataVault: '0',
        }),
      );
    });

    it('relanza el error del gateway en token sale', async () => {
      const post = mockPost();
      post.mockRejectedValue(new Error('token error'));

      await expect(
        service.processTokenSale({
          dataVaultToken: 'tok',
          dataVaultExpiration: '202812',
          amountCents: 1000,
          itbisCents: 180,
          orderNumber: 'ORD-10',
        }),
      ).rejects.toThrow('token error');
    });

    it('voidTransaction envía el azul order id', async () => {
      const post = mockPost();
      post.mockResolvedValue({ data: { IsoCode: '00' } });

      const res = await service.voidTransaction('azul-99');

      expect(res.IsoCode).toBe('00');
      expect(post).toHaveBeenCalledWith(
        '/WebServices/JSON/default.aspx?ProcessVoid',
        expect.objectContaining({ AzulOrderId: 'azul-99' }),
      );
    });

    it('relanza el error del gateway en void', async () => {
      const post = mockPost();
      post.mockRejectedValue(new Error('void error'));

      await expect(service.voidTransaction('azul-99')).rejects.toThrow(
        'void error',
      );
    });
  });
});
