import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { decodeTenantArchive, restoreTenantArchive } from '../src/modules/backups/tenant-archive';

// Explicit isolated destination: the application DATABASE_URL is never a fallback.
async function main() {
  const [file, checksum, confirmation] = process.argv.slice(2);
  const destination = process.env.RESTORE_DATABASE_URL;
  if (!file || !/^[a-f0-9]{64}$/i.test(checksum || '') || confirmation !== '--confirm-isolated' || !destination) {
    throw new Error('Usage: RESTORE_DATABASE_URL=... ts-node scripts/restore-backup.ts FILE SHA256 --confirm-isolated');
  }
  const target = new URL(destination);
  if (!/^\/(dolphin_restore|dolphin_test)[a-z0-9_]*$/i.test(target.pathname)) throw new Error('Destination database must start with dolphin_restore or dolphin_test');
  if (destination === process.env.DATABASE_URL) throw new Error('Cannot restore over the application database');
  const rawKey = process.env.BACKUP_ENCRYPTION_KEY || '';
  const key = /^[a-f0-9]{64}$/i.test(rawKey) ? Buffer.from(rawKey, 'hex') : Buffer.from(rawKey, 'base64');
  const archive = decodeTenantArchive(await readFile(file), key, checksum);
  const db = new PrismaClient({ datasources: { db: { url: destination } } });
  try {
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED');
      // The target must have migrations applied, but no business or identity data.
      for (const name of Object.keys(archive.tables)) {
        const delegate = (tx as any)[name[0].toLowerCase() + name.slice(1)];
        if (await delegate.count()) throw new Error('Restore target is not empty: ' + name);
      }
      await restoreTenantArchive(tx, archive);
    }, { isolationLevel: 'Serializable', timeout: 300_000 });
    console.log(JSON.stringify({ restored: true, empresaId: archive.empresaId, counts: archive.counts }));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error('Restore failed. Destination unchanged; check schema, isolation, key, checksum and archive integrity.'); process.exitCode = 1; });
