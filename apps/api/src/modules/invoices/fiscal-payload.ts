import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const money = (value: unknown) => new Prisma.Decimal(String(value ?? 0));
const fixed = (value: Prisma.Decimal) => value.toFixed(2);
function date(value: string | Date | undefined | null, calendarOnly = false): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) throw new BadRequestException('Falta una fecha fiscal válida');
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: calendarOnly ? 'UTC' : 'America/Santo_Domingo', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(new Date(value));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return part('day') + '-' + part('month') + '-' + part('year');
}
export function buildEcfPayload(invoice: any, empresa: any) {
  const type = String(invoice.tipoNcf || '').toUpperCase();
  if (!['E31','E32','E33','E34','E44','E45','E46'].includes(type))
    throw new BadRequestException('El tipo de e-CF requiere un flujo fiscal especializado, no una factura de venta genérica');
  if (!new RegExp('^' + type + '[0-9]{10}$').test(invoice.ncf || ''))
    throw new BadRequestException('e-NCF inválido');
  const issuer = String(empresa.rnc || '').replace(/\D/g, '');
  if (!/^(?:\d{9}|\d{11})$/.test(issuer) || !empresa.razonSocial?.trim() || !empresa.direccion?.trim())
    throw new BadRequestException('Completa el RNC, razón social y dirección fiscal del emisor');
  if (invoice.moneda && invoice.moneda !== 'DOP')
    throw new BadRequestException('La emisión en otra moneda requiere el desglose fiscal DOP/OtraMoneda; no se transmitirá como pesos');
  if (!invoice.detalles?.length) throw new BadRequestException('El e-CF requiere líneas de detalle');

  const bases = ['0','0','0','0'].map(money), taxes = ['0','0','0'].map(money);
  let net = money(0), discountTotal = money(0);
  const items = invoice.detalles.map((line: any, index: number) => {
    const rate = money(line.tasaItbis), base = money(line.subtotal), tax = money(line.itbis);
    const indicator = String(line.indicadorFacturacion || '');
    const rates: Record<string, number> = {'1':18, '2':16, '3':0, '4':0};
    if (!(indicator in rates) || !rate.eq(rates[indicator]))
      throw new BadRequestException('La tasa ITBIS y el indicador fiscal de una línea no coinciden');
    if (type === 'E44' && indicator !== '4') throw new BadRequestException('E44 requiere líneas exentas');
    if (type === 'E46' && indicator !== '3') throw new BadRequestException('E46 requiere líneas gravadas a tasa cero');
    const quantity = money(line.cantidad), price = money(line.precioUnitario), discount = money(line.descuento);
    if (quantity.lte(0) || price.lt(0) || discount.lt(0) || base.lt(0) ||
        !quantity.mul(price).sub(discount).toDecimalPlaces(2).eq(base) ||
        !base.mul(rate).div(100).toDecimalPlaces(2).eq(tax))
      throw new BadRequestException('Los importes fiscales de una línea no cuadran');
    bases[Number(indicator)-1] = bases[Number(indicator)-1].add(base);
    if (indicator !== '4') taxes[Number(indicator)-1] = taxes[Number(indicator)-1].add(tax);
    net = net.add(base); discountTotal = discountTotal.add(discount);
    return {
      NumeroLinea: String(index+1), IndicadorFacturacion: indicator,
      NombreItem: line.descripcion || line.producto?.nombre || 'Producto',
      IndicadorBienoServicio: line.producto?.tipo === 'SERVICIO' ? '2' : '1',
      CantidadItem: quantity.toFixed(2), PrecioUnitarioItem: price.toFixed(2),
      ...(discount.gt(0) ? { DescuentoMonto: fixed(discount), TablaSubDescuento: {
        SubDescuento: [{ TipoSubDescuento: '$', MontoSubDescuento: fixed(discount) }],
      } } : {}),
      MontoItem: fixed(base),
    };
  });
  const totalTax = taxes.reduce((sum, value) => sum.add(value), money(0));
  if (!net.add(totalTax).eq(money(invoice.total)) || !totalTax.eq(money(invoice.itbis)) ||
      !discountTotal.eq(money(invoice.descuento)))
    throw new BadRequestException('La cabecera y las líneas fiscales no cuadran; revisa los descuentos e impuestos');
  const code = type.slice(1);
  const idDoc: Record<string, any> = {
    TipoeCF: code, eNCF: invoice.ncf,
    ...(!['E32','E34'].includes(type) ? {FechaVencimientoSecuencia: date(invoice.fechaVencimientoNcf, true)} : {}),
    ...(!['E34','E44','E46'].includes(type) && bases.slice(0,3).some(x=>x.gt(0)) ? {IndicadorMontoGravado:'0'} : {}),
    TipoIngresos: '01', TipoPago: invoice.tipoPago === 'CREDITO' ? '2' : '1',
    ...(invoice.tipoPago === 'CREDITO' && invoice.fechaVencimiento ? {FechaLimitePago:date(invoice.fechaVencimiento, true)} : {}),
  };
  const totals: Record<string,string> = {MontoTotal:fixed(money(invoice.total))};
  const taxable = bases[0].add(bases[1]).add(bases[2]);
  if (taxable.gt(0)) {
    totals.MontoGravadoTotal=fixed(taxable); totals.TotalITBIS=fixed(totalTax);
    bases.slice(0,3).forEach((base,index)=>{
      if (base.gt(0)) { totals['MontoGravadoI'+(index+1)]=fixed(base); totals['ITBIS'+(index+1)]=String([18,16,0][index]); totals['TotalITBIS'+(index+1)]=fixed(taxes[index]); }
    });
  }
  if (bases[3].gt(0)) totals.MontoExento=fixed(bases[3]);
  const buyer = invoice.cliente;
  const buyerId = String(buyer?.numeroDocumento || '').replace(/\D/g,'');
  const needsBuyer = type !== 'E32' || money(invoice.total).gte(250000);
  if (needsBuyer && (!buyer?.nombreRazonSocial || (type !== 'E46' && !/^(?:\d{9}|\d{11})$/.test(buyerId))))
    throw new BadRequestException('Este tipo o monto de e-CF requiere identificar al comprador');
  const ecf: any = {
    Encabezado:{Version:'1.0',IdDoc:idDoc,Emisor:{
      RNCEmisor:issuer,RazonSocialEmisor:empresa.razonSocial,DireccionEmisor:empresa.direccion,
      FechaEmision:date(invoice.fecha),
    }, ...(buyer ? {Comprador:{
      ...(type === 'E46' ? {IdentificadorExtranjero:buyer.numeroDocumento} : buyerId ? {RNCComprador:buyerId} : {}),
      RazonSocialComprador:buyer.nombreRazonSocial,
    }} : {}),Totales:totals},
    DetallesItems:{Item:items},
  };
  if (type === 'E33' || type === 'E34') {
    if (!invoice.ncfModificado || !invoice.facturaOriginal?.fecha || !/^[1-5]$/.test(invoice.motivoModificacion || ''))
      throw new BadRequestException('La nota requiere comprobante original, fecha original y código de modificación');
    ecf.InformacionReferencia={NCFModificado:invoice.ncfModificado,FechaNCFModificado:date(invoice.facturaOriginal.fecha),CodigoModificacion:invoice.motivoModificacion};
    if (type === 'E34') {
      const days = (new Date(invoice.fecha).getTime()-new Date(invoice.facturaOriginal.fecha).getTime())/86400000;
      idDoc.IndicadorNotaCredito=days>30?'1':'0';
      if (days>30 && totalTax.gt(0)) throw new BadRequestException('Una nota de crédito mayor de 30 días no puede rebajar el ITBIS original');
    }
  }
  return {fiscal_json:{ECF:ecf}};
}
