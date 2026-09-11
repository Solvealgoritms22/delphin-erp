import { Prisma } from '@prisma/client';
import { allocateGlobalDiscount, DiscountLine } from './invoice-discounts';
const d = (n: string | number) => new Prisma.Decimal(n);
function line(base: number, rate: number): DiscountLine {
  return { cantidad:d(1), precioUnitario:d(base), descuento:d(0), porcentajeDescuento:d(0),
    subtotal:d(base), tasaItbis:d(rate), itbis:d(base).mul(rate).div(100), total:d(base).mul(1+rate/100) };
}
describe('global discounts', () => {
  it('reduces each tax base proportionally, including exempt lines', () => {
    const lines = [line(100,18),line(100,16),line(100,0)];
    allocateGlobalDiscount(lines,d(30),2);
    expect(lines.map(x=>x.subtotal.toFixed(2))).toEqual(['90.00','90.00','90.00']);
    expect(lines.map(x=>x.itbis.toFixed(2))).toEqual(['16.20','14.40','0.00']);
  });
  it('allocates a one-cent residual exactly once', () => {
    const lines = [line(1,18),line(1,18),line(1,18)];
    allocateGlobalDiscount(lines,d('0.01'),2);
    expect(lines.reduce((s,x)=>s.add(x.descuento),d(0)).toFixed(2)).toBe('0.01');
    expect(lines.every(x=>x.subtotal.gte(0))).toBe(true);
  });
  it('supports full discounts without remaining tax', () => {
    const lines = [line(1,18),line(2,16)];
    allocateGlobalDiscount(lines,d(3),2);
    expect(lines.every(x=>x.total.eq(0))).toBe(true);
  });
  it.each([-1,101])('rejects out-of-range discount %s', amount => {
    expect(()=>allocateGlobalDiscount([line(100,18)],d(amount),2)).toThrow();
  });
});
