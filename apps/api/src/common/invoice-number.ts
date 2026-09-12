import { Prisma } from '@prisma/client';
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  empresaId: string,
  prefix: 'FAC' | 'NC' = 'FAC',
): Promise<string> {
  // The counter is advanced in the same transaction as the invoice and stock.
  const key = empresaId + ':' + prefix;
  const rows = await tx.$queryRaw<Array<{ value: bigint }>>`
      INSERT INTO document_counters (key, value)
      VALUES (${key}, COALESCE((SELECT MAX(substring(numero_factura from '[0-9]+$')::bigint)
        FROM facturas_venta WHERE empresa_id = ${empresaId} AND numero_factura ~ ${'^' + prefix + '-[0-9]+$'}), 0) + 1)
      ON CONFLICT (key) DO UPDATE SET value = document_counters.value + 1 RETURNING value
    `;
  return prefix + '-' + String(rows[0].value).padStart(6, '0');
}
