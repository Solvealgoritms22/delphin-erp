import { buildEcfPayload } from './fiscal-payload';
const issuer = {
  rnc: '101000001',
  razonSocial: 'Empresa de prueba',
  direccion: 'Dirección de prueba',
};
function invoice(overrides: Record<string, unknown> = {}) {
  return {
    tipoNcf: 'E31',
    ncf: 'E310000000001',
    moneda: 'DOP',
    fecha: '2026-09-11T02:00:00Z',
    fechaVencimientoNcf: '2027-12-31T00:00:00Z',
    tipoPago: 'CONTADO',
    cliente: { numeroDocumento: '101000002', nombreRazonSocial: 'Cliente' },
    total: 118,
    itbis: 18,
    descuento: 0,
    detalles: [
      {
        cantidad: 1,
        precioUnitario: 100,
        descuento: 0,
        subtotal: 100,
        itbis: 18,
        tasaItbis: 18,
        indicadorFacturacion: '1',
        descripcion: 'Servicio',
        producto: { tipo: 'SERVICIO' },
      },
    ],
    ...overrides,
  };
}
describe('fiscal payload', () => {
  it('uses net prices and preserves sequence calendar dates independently of emission timezone', () => {
    const ecf = buildEcfPayload(invoice(), issuer).fiscal_json.ECF;
    expect(ecf.Encabezado.IdDoc.IndicadorMontoGravado).toBe('0');
    expect(ecf.Encabezado.IdDoc.FechaVencimientoSecuencia).toBe('31-12-2027');
    expect(ecf.Encabezado.Emisor.FechaEmision).toBe('10-09-2026');
    expect(ecf.Encabezado.Totales.TotalITBIS1).toBe('18.00');
    expect(ecf.DetallesItems.Item[0].IndicadorBienoServicio).toBe('2');
  });
  it('does not fabricate issuer identity', () => {
    expect(() =>
      buildEcfPayload(invoice(), { ...issuer, rnc: null }),
    ).toThrow();
  });
  it('rejects header discrepancies before transmission', () => {
    expect(() => buildEcfPayload(invoice({ total: 117 }), issuer)).toThrow();
  });
  it('rejects foreign currency until a complete conversion exists', () => {
    expect(() => buildEcfPayload(invoice({ moneda: 'USD' }), issuer)).toThrow();
  });
  it('omits sequence expiration for consumer invoices', () => {
    const ecf = buildEcfPayload(
      invoice({
        tipoNcf: 'E32',
        ncf: 'E320000000001',
        cliente: null,
        fechaVencimientoNcf: null,
      }),
      issuer,
    ).fiscal_json.ECF;
    expect(ecf.Encabezado.IdDoc).not.toHaveProperty(
      'FechaVencimientoSecuencia',
    );
  });
  it('requires buyer identification at the consumer invoice threshold', () => {
    const data = invoice({
      tipoNcf: 'E32',
      ncf: 'E320000000001',
      cliente: null,
      total: 250000,
      itbis: 0,
      detalles: [
        {
          cantidad: 1,
          precioUnitario: 250000,
          subtotal: 250000,
          itbis: 0,
          descuento: 0,
          tasaItbis: 0,
          indicadorFacturacion: '4',
        },
      ],
    });
    expect(() => buildEcfPayload(data, issuer)).toThrow();
  });
  it('does not confuse exempt and 16-percent indicators', () => {
    const data = invoice({
      total: 100,
      itbis: 0,
      detalles: [
        {
          cantidad: 1,
          precioUnitario: 100,
          subtotal: 100,
          itbis: 0,
          descuento: 0,
          tasaItbis: 0,
          indicadorFacturacion: '2',
        },
      ],
    });
    expect(() => buildEcfPayload(data, issuer)).toThrow();
  });
});
