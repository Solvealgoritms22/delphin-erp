import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface DiscountLine {
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  descuento: Prisma.Decimal;
  porcentajeDescuento: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  tasaItbis: Prisma.Decimal;
  itbis: Prisma.Decimal;
  total: Prisma.Decimal;
}
// Allocate the discount proportionally on the remaining net bases. Cumulative
// rounding preserves the exact discount, including one-cent residuals.
export function allocateGlobalDiscount(
  lines: DiscountLine[],
  amount: Prisma.Decimal,
  precision: number,
) {
  const base = lines.reduce(
    (sum, line) => sum.add(line.subtotal),
    new Prisma.Decimal(0),
  );
  if (amount.lt(0) || amount.gt(base))
    throw new BadRequestException(
      'Descuento global fuera del saldo de las líneas',
    );
  let accumulated = new Prisma.Decimal(0),
    allocated = new Prisma.Decimal(0);
  for (const line of lines) {
    accumulated = accumulated.add(line.subtotal);
    const target = base.eq(0)
      ? new Prisma.Decimal(0)
      : amount.mul(accumulated).div(base).toDecimalPlaces(precision);
    const share = target.sub(allocated);
    allocated = target;
    line.descuento = line.descuento.add(share);
    line.subtotal = line.subtotal.sub(share);
    const gross = line.cantidad.mul(line.precioUnitario);
    line.porcentajeDescuento = gross.eq(0)
      ? new Prisma.Decimal(0)
      : line.descuento.mul(100).div(gross);
    line.itbis = line.subtotal
      .mul(line.tasaItbis)
      .div(100)
      .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
    line.total = line.subtotal
      .add(line.itbis)
      .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
  }
}
