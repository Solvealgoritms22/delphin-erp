import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';

export interface AzulSaleDto {
  cardNumber: string;
  expiration: string; // MMYY format e.g. "1228"
  cvc: string;
  cardHolder: string;
  amountCents: number; // Amount in cents (RD$100.00 = 10000)
  itbisCents: number; // ITBIS in cents
  orderNumber: string;
}

export interface AzulTokenSaleDto {
  dataVaultToken: string;
  dataVaultExpiration: string;
  amountCents: number;
  itbisCents: number;
  orderNumber: string;
}

export interface AzulResponse {
  IsoCode: string; // "00" = approved
  ResponseMessage: string;
  AuthorizationCode?: string;
  DataVaultToken?: string;
  DataVaultExpiration?: string;
  CardNumber?: string; // Masked
  CardBrand?: string; // VISA, MASTERCARD, AMEX
  AzuleOrderId?: string;
  DateTime?: string;
  TicketNumber?: string;
  RRN?: string;
  ErrorDescription?: string;
}

@Injectable()
export class AzulService {
  private readonly logger = new Logger(AzulService.name);

  private getHttpClient() {
    const env = process.env.AZUL_ENV || 'MOCK';
    const auth1 = process.env.AZUL_AUTH1;
    const auth2 = process.env.AZUL_AUTH2;
    const merchantId = process.env.AZUL_MERCHANT_ID;

    const isMockMode = env === 'MOCK' || !auth1 || !auth2 || !merchantId;
    const baseUrl =
      env === 'PRODUCTION'
        ? 'https://pagos.azul.com.do'
        : 'https://pruebas.azul.com.do';

    if (isMockMode) {
      if (env === 'PRODUCTION') {
        throw new InternalServerErrorException(
          'Error de configuración de cobros: credenciales de Azul incompletas para producción.',
        );
      }
      this.logger.warn(
        '⚠️  AZUL running in MOCK mode. Set AZUL_AUTH1, AZUL_AUTH2, AZUL_MERCHANT_ID to use real gateway.',
      );
    }

    const http = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Auth1: auth1 || '',
        Auth2: auth2 || '',
      },
    });

    return { http, isMockMode, merchantId: merchantId || 'MOCK_MERCHANT' };
  }

  /**
   * Process a card sale AND tokenize the card for future recurring charges.
   */
  async processCardSaleWithTokenization(
    dto: AzulSaleDto,
  ): Promise<AzulResponse> {
    const { http, isMockMode, merchantId } = this.getHttpClient();
    if (isMockMode) {
      return this.getMockApprovalWithToken(dto.cardHolder, dto.cardNumber);
    }

    try {
      const payload = {
        Channel: 'EC',
        Store: merchantId,
        OrderNumber: dto.orderNumber,
        Amount: dto.amountCents.toString(),
        Itbis: dto.itbisCents.toString(),
        CardNumber: dto.cardNumber,
        Expiration: dto.expiration,
        CVC: dto.cvc,
        PosInputMode: 'E-Commerce',
        SaveToDataVault: '1',
      };

      const response = await http.post<AzulResponse>(
        '/WebServices/JSON/default.aspx',
        payload,
      );

      this.logger.log(
        `Azul Card Sale: OrderNumber=${dto.orderNumber} | IsoCode=${response.data.IsoCode} | Token=${response.data.DataVaultToken?.substring(0, 8)}...`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Azul card sale failed',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Process a recurring charge using a saved DataVault token.
   */
  async processTokenSale(dto: AzulTokenSaleDto): Promise<AzulResponse> {
    const { http, isMockMode, merchantId } = this.getHttpClient();
    if (isMockMode) {
      return this.getMockApproval();
    }

    try {
      const payload = {
        Channel: 'EC',
        Store: merchantId,
        OrderNumber: dto.orderNumber,
        Amount: dto.amountCents.toString(),
        Itbis: dto.itbisCents.toString(),
        DataVaultToken: dto.dataVaultToken,
        DataVaultExpiration: dto.dataVaultExpiration,
        SaveToDataVault: '0',
        PosInputMode: 'E-Commerce',
      };

      const response = await http.post<AzulResponse>(
        '/WebServices/JSON/default.aspx',
        payload,
      );

      this.logger.log(
        `Azul Token Sale: OrderNumber=${dto.orderNumber} | IsoCode=${response.data.IsoCode} | Msg=${response.data.ResponseMessage}`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Azul token sale failed',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Void/reverse a transaction (in case of errors or 1 peso authorization)
   */
  async voidTransaction(azulOrderId: string): Promise<AzulResponse> {
    const { http, isMockMode, merchantId } = this.getHttpClient();
    if (isMockMode) {
      return { IsoCode: '00', ResponseMessage: 'APROBADA (MOCK VOID)' };
    }

    try {
      const payload = {
        Channel: 'EC',
        Store: merchantId,
        AzulOrderId: azulOrderId,
      };

      const response = await http.post<AzulResponse>(
        '/WebServices/JSON/default.aspx?ProcessVoid',
        payload,
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Azul void failed',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  isApproved(response: AzulResponse): boolean {
    return response.IsoCode === '00';
  }

  // ─── Mock helpers for development without credentials ───────────────────────

  private getMockApprovalWithToken(
    cardHolder: string,
    cardNumber: string,
  ): AzulResponse {
    const last4 = cardNumber.replace(/\s/g, '').slice(-4);
    const brand = this.detectBrand(cardNumber);
    return {
      IsoCode: '00',
      ResponseMessage: 'APROBADA (MOCK)',
      AuthorizationCode: 'MOCK01',
      DataVaultToken: `MOCK-TOKEN-${Date.now()}`,
      DataVaultExpiration: '202812',
      CardNumber: `****${last4}`,
      CardBrand: brand,
      AzuleOrderId: `MOCK-ORDER-${Date.now()}`,
      DateTime: new Date().toISOString(),
    };
  }

  private getMockApproval(): AzulResponse {
    return {
      IsoCode: '00',
      ResponseMessage: 'APROBADA (MOCK)',
      AuthorizationCode: 'MOCK01',
      AzuleOrderId: `MOCK-ORDER-${Date.now()}`,
      DateTime: new Date().toISOString(),
    };
  }

  private detectBrand(cardNumber: string): string {
    const num = cardNumber.replace(/\s/g, '');
    if (/^4/.test(num)) return 'VISA';
    if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return 'MASTERCARD';
    if (/^3[47]/.test(num)) return 'AMEX';
    if (/^6/.test(num)) return 'DISCOVER';
    return 'UNKNOWN';
  }
}
