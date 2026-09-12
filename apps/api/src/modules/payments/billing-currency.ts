import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Catalog prices are USD. ProcessPayment does not receive an arbitrary
 * Currency field: the settlement setup must be confirmed for the merchant.
 * DOP charging requires a separately approved, persisted FX quote.
 */
export function assertAzulPlanCurrency() {
  const live =
    process.env.NODE_ENV === 'production' ||
    process.env.AZUL_ENV === 'PRODUCTION';
  if (live && process.env.BILLING_TARIFF_CONFIRMED !== 'true') {
    throw new ServiceUnavailableException(
      'Cobros suspendidos: la tarifa, periodicidad e impuestos deben estar confirmados antes de habilitar cargos reales.',
    );
  }
  if (live && process.env.AZUL_MERCHANT_CURRENCY !== 'USD') {
    throw new ServiceUnavailableException(
      'Cobros de planes suspendidos: confirma la afiliación Azul en USD. Un comercio DOP requiere cotización y conversión de moneda antes del cargo.',
    );
  }
}
