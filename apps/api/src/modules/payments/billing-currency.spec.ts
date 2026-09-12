import { assertAzulPlanCurrency } from './billing-currency';
describe('USD catalog charging safety', () => {
  const original = {
    node: process.env.NODE_ENV,
    azul: process.env.AZUL_ENV,
    currency: process.env.AZUL_MERCHANT_CURRENCY,
    tariff: process.env.BILLING_TARIFF_CONFIRMED,
  };
  afterEach(() => {
    for (const [key, value] of Object.entries({
      NODE_ENV: original.node,
      AZUL_ENV: original.azul,
      AZUL_MERCHANT_CURRENCY: original.currency,
      BILLING_TARIFF_CONFIRMED: original.tariff,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  it.each([undefined, 'DOP', 'EUR'])(
    'refuses live USD prices with merchant currency %s',
    (currency) => {
      process.env.NODE_ENV = 'production';
      process.env.BILLING_TARIFF_CONFIRMED = 'true';
      if (currency) process.env.AZUL_MERCHANT_CURRENCY = currency;
      else delete process.env.AZUL_MERCHANT_CURRENCY;
      expect(assertAzulPlanCurrency).toThrow();
    },
  );
  it('accepts an explicitly configured USD merchant', () => {
    process.env.NODE_ENV = 'production';
    process.env.BILLING_TARIFF_CONFIRMED = 'true';
    process.env.AZUL_MERCHANT_CURRENCY = 'USD';
    expect(assertAzulPlanCurrency).not.toThrow();
  });
});
