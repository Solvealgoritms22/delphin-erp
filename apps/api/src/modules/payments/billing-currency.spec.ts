import { assertAzulPlanCurrency } from './billing-currency';
describe('USD catalog charging safety', () => {
  const original = {
    node: process.env.NODE_ENV,
    azul: process.env.AZUL_ENV,
    currency: process.env.AZUL_MERCHANT_CURRENCY,
  };
  afterEach(() => {
    for (const [key, value] of Object.entries({
      NODE_ENV: original.node,
      AZUL_ENV: original.azul,
      AZUL_MERCHANT_CURRENCY: original.currency,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  it.each([undefined, 'DOP', 'EUR'])(
    'refuses live USD prices with merchant currency %s',
    (currency) => {
      process.env.NODE_ENV = 'production';
      if (currency) process.env.AZUL_MERCHANT_CURRENCY = currency;
      else delete process.env.AZUL_MERCHANT_CURRENCY;
      expect(assertAzulPlanCurrency).toThrow();
    },
  );
  it('accepts an explicitly configured USD merchant', () => {
    process.env.NODE_ENV = 'production';
    process.env.AZUL_MERCHANT_CURRENCY = 'USD';
    expect(assertAzulPlanCurrency).not.toThrow();
  });
});
