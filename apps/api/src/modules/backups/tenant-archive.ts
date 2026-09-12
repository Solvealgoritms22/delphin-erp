import { Prisma } from '@prisma/client';
import { createHash, createDecipheriv } from 'crypto';
import { gunzipSync } from 'zlib';

type Db = Prisma.TransactionClient;
type Row = Record<string, any>;
export interface TenantArchive {
  schemaVersion: 2;
  empresaId: string;
  exportedAt: string;
  counts: Record<string, number>;
  tables: Record<string, Row[]>;
  exclusions: string[];
}

const indirect: Record<string, string> = {
  Factura: 'suscripcion',
  FacturaVentaDetalle: 'factura',
  FacturaCompraDetalle: 'facturaCompra',
  CotizacionDetalle: 'cotizacion',
  ImpuestoFactura: 'factura',
  AplicacionPago: 'pago',
  AplicacionPagoProveedor: 'pago',
  AiMessage: 'conversacion',
  NotificationDelivery: 'notification',
};
// These contain sessions, user-level preferences, or physical backup metadata;
// they are intentionally not replayed as business records.
export const OPERATIONAL_EXCLUSIONS = [
  'MfaCredential',
  'AuthFlow',
  'UserSession',
  'GoogleDriveConnection',
  'NotificationPreference',
  'PushSubscription',
  'Backup',
];

function delegate(db: Db, name: string): any {
  return (db as any)[name[0].toLowerCase() + name.slice(1)];
}

export async function exportTenantArchive(
  db: Db,
  empresaId: string,
): Promise<TenantArchive> {
  const tables: Record<string, Row[]> = {};
  const company = await db.empresa.findUnique({ where: { id: empresaId } });
  if (!company) throw new Error('Company not found');
  tables.Empresa = [company];
  for (const model of Prisma.dmmf.datamodel.models) {
    if (
      ['Empresa', 'Usuario', 'Plan', ...OPERATIONAL_EXCLUSIONS].includes(
        model.name,
      )
    )
      continue;
    const relation = indirect[model.name];
    const where = model.fields.some((f) => f.name === 'empresaId')
      ? { empresaId }
      : relation
        ? { [relation]: { empresaId } }
        : null;
    if (!where)
      throw new Error('Backup ownership mapping missing for ' + model.name);
    tables[model.name] = await delegate(db, model.name).findMany({ where });
  }
  const userIds = new Set<string>(
    [
      company.propietarioId,
      ...(tables.Membresia || []).map((row) => row.usuarioId),
    ].filter(Boolean),
  );
  for (const rows of Object.values(tables))
    for (const row of rows) if (row.usuarioId) userIds.add(row.usuarioId);
  const users = await db.usuario.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, email: true, nombre: true, avatar: true },
  });
  tables.Usuario = users.map((user) => ({
    ...user,
    passwordHash: '!restored-account-requires-reset',
    isVerified: false,
    debeCambiarPassword: true,
  }));
  const planIds = [
    ...new Set((tables.Suscripcion || []).map((row) => row.planId)),
  ];
  tables.Plan = await db.plan.findMany({ where: { id: { in: planIds } } });
  // A restore never replays queued external charges, fiscal submissions or messages.
  for (const row of tables.OutboxEvent || []) row.estado = 'RESTORED_PAUSED';
  for (const row of tables.NotificationDelivery || [])
    if (row.estado !== 'SENT') row.estado = 'RESTORED_PAUSED';
  for (const row of tables.TenantApiApp || []) row.estado = 'REVOCADO';
  const counts = Object.fromEntries(
    Object.entries(tables).map(([name, rows]) => [name, rows.length]),
  );
  return {
    schemaVersion: 2,
    empresaId,
    exportedAt: new Date().toISOString(),
    counts,
    tables,
    exclusions: OPERATIONAL_EXCLUSIONS,
  };
}

export function decodeTenantArchive(
  encrypted: Buffer,
  key: Buffer,
  checksum: string,
): TenantArchive {
  if (createHash('sha256').update(encrypted).digest('hex') !== checksum)
    throw new Error('Backup checksum mismatch');
  const magic = Buffer.from('DOLPHIN-BACKUP-V1\0');
  if (!encrypted.subarray(0, magic.length).equals(magic) || key.length !== 32)
    throw new Error('Unsupported backup encryption');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    encrypted.subarray(magic.length, magic.length + 12),
  );
  decipher.setAuthTag(encrypted.subarray(magic.length + 12, magic.length + 28));
  const compressed = Buffer.concat([
    decipher.update(encrypted.subarray(magic.length + 28)),
    decipher.final(),
  ]);
  const archive = JSON.parse(
    gunzipSync(compressed, { maxOutputLength: 512 * 1024 * 1024 }).toString(
      'utf8',
    ),
  );
  validateTenantArchive(archive);
  return archive;
}

export function validateTenantArchive(archive: TenantArchive): void {
  if (
    archive.schemaVersion !== 2 ||
    !archive.empresaId ||
    !archive.tables ||
    !archive.counts
  )
    throw new Error('Incomplete or unsupported backup; version 2 required');
  const models = Prisma.dmmf.datamodel.models.filter(
    (model) => !OPERATIONAL_EXCLUSIONS.includes(model.name),
  );
  for (const model of models) {
    const rows = archive.tables[model.name];
    if (!Array.isArray(rows) || rows.length !== archive.counts[model.name])
      throw new Error('Invalid count for ' + model.name);
    for (const row of rows) {
      if (row.empresaId && row.empresaId !== archive.empresaId)
        throw new Error('Cross-tenant archive row');
      for (const relation of model.fields.filter(
        (f) => f.kind === 'object' && f.relationFromFields?.length,
      )) {
        if (OPERATIONAL_EXCLUSIONS.includes(relation.type)) continue;
        const foreign = relation.relationFromFields!;
        const values = foreign.map((field) => row[field]);
        if (values.some((value) => value == null)) continue;
        if (
          !(archive.tables[relation.type] || []).some((target) =>
            relation.relationToFields!.every(
              (field, i) => target[field] === values[i],
            ),
          )
        ) {
          throw new Error(
            'Broken reference in ' + model.name + '.' + relation.name,
          );
        }
      }
    }
  }
  if (
    archive.tables.Empresa.length !== 1 ||
    archive.tables.Empresa[0].id !== archive.empresaId
  )
    throw new Error('Invalid company identity');
}

export async function restoreTenantArchive(
  db: Db,
  archive: TenantArchive,
): Promise<void> {
  validateTenantArchive(archive);
  const models = Prisma.dmmf.datamodel.models.filter(
    (model) => archive.tables[model.name],
  );
  const remaining = new Set(models.map((model) => model.name));
  while (remaining.size) {
    const ready = models.filter(
      (model) =>
        remaining.has(model.name) &&
        !model.fields.some(
          (field) =>
            field.kind === 'object' &&
            field.relationFromFields?.length &&
            field.type !== model.name &&
            remaining.has(field.type) &&
            archive.tables[model.name].some((row) =>
              field.relationFromFields!.some((f) => row[f] != null),
            ),
        ),
    );
    if (!ready.length) throw new Error('Unresolved backup dependency cycle');
    for (const model of ready) {
      const rows = archive.tables[model.name].map((row) => {
        const result = { ...row };
        for (const field of model.fields) {
          if (field.type === 'BigInt' && result[field.name] != null)
            result[field.name] = BigInt(result[field.name]);
          if (field.type === 'DateTime' && result[field.name] != null)
            result[field.name] = new Date(result[field.name]);
        }
        return result;
      });
      if (rows.length)
        await delegate(db, model.name).createMany({ data: rows });
      if ((await delegate(db, model.name).count()) !== rows.length)
        throw new Error('Restore count mismatch: ' + model.name);
      remaining.delete(model.name);
    }
  }
}
