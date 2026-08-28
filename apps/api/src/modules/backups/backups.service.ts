import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { google } from 'googleapis';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { basename, dirname, join, resolve } from 'path';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';

const gzipAsync = promisify(gzip);
const TENANT_MODELS = [
  'sucursal',
  'almacen',
  'inventarioStock',
  'movimientoInventario',
  'membresia',
  'role',
  'categoria',
  'marca',
  'unidadMedida',
  'producto',
  'cliente',
  'proveedor',
  'notification',
  'secuenciaNCF',
  'facturaVenta',
  'aiConversation',
  'activityLog',
  'configuracionEmpresa',
  'impuesto',
  'terminoPago',
  'pagoCliente',
] as const;

type Provider = 'LOCAL' | 'GOOGLE_DRIVE';

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);
  private readonly oauthStates = new Map<
    string,
    { userId: string; expiresAt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  async list(userId: string, empresaId?: string) {
    if (!empresaId) throw new BadRequestException('Empresa activa requerida');
    await this.assertOwner(userId, empresaId);
    const backups = await this.prisma.backup.findMany({
      where: { propietarioId: userId, empresaId, estado: { not: 'DELETED' } },
      select: {
        id: true,
        empresaId: true,
        proveedor: true,
        estado: true,
        formato: true,
        nombreArchivo: true,
        externalFileId: true,
        tamanoBytes: true,
        sha256: true,
        error: true,
        creadoEn: true,
        completadoEn: true,
      },
      orderBy: { creadoEn: 'desc' },
    });
    return backups.map((b) => ({
      ...b,
      tamanoBytes: b.tamanoBytes != null ? Number(b.tamanoBytes) : null,
    }));
  }

  async create(
    userId: string,
    empresaId: string | undefined,
    provider: Provider,
  ) {
    if (!empresaId) throw new BadRequestException('Empresa activa requerida');
    await this.assertOwner(userId, empresaId);
    if (
      provider === 'GOOGLE_DRIVE' &&
      !(await this.prisma.googleDriveConnection.findUnique({
        where: { propietarioId: userId },
      }))
    ) {
      throw new BadRequestException(
        'Conecta Google Drive antes de crear un backup remoto',
      );
    }

    const id = cryptoRandomId();
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const name = `backup_${timestamp}.backup`;
    await this.prisma.backup.create({
      data: {
        id,
        propietarioId: userId,
        empresaId,
        proveedor: provider,
        nombreArchivo: name,
        iniciadoEn: new Date(),
      },
    });

    try {
      const plain = await this.exportTenant(empresaId);
      const encrypted = await this.encrypt(plain);
      const sha256 = createHash('sha256').update(encrypted).digest('hex');
      const storageKey = await this.saveLocal(userId, empresaId, id, encrypted);
      let externalFileId: string | undefined;
      if (provider === 'GOOGLE_DRIVE')
        externalFileId = await this.uploadDrive(userId, name, encrypted);
      const result = await this.prisma.backup.update({
        where: { id },
        data: {
          estado: 'COMPLETED',
          storageKey,
          externalFileId,
          tamanoBytes: encrypted.length,
          sha256,
          completadoEn: new Date(),
        },
        select: {
          id: true,
          proveedor: true,
          estado: true,
          nombreArchivo: true,
          tamanoBytes: true,
          sha256: true,
          completadoEn: true,
        },
      });
      await this.activity.log({
        empresaId,
        usuarioId: userId,
        modulo: 'BACKUPS',
        accion: 'CREATE',
        resourceId: id,
        resourceName: name,
        resourceType: 'Backup',
        metadata: { provider, sha256 },
      });
      return {
        ...result,
        tamanoBytes:
          result.tamanoBytes != null ? Number(result.tamanoBytes) : null,
      };
    } catch (error) {
      await this.prisma.backup
        .update({
          where: { id },
          data: { estado: 'FAILED', error: safeError(error) },
        })
        .catch(() => undefined);
      throw error;
    }
  }

  async readLocal(userId: string, id: string) {
    const backup = await this.prisma.backup.findFirst({
      where: { id, propietarioId: userId, estado: 'COMPLETED' },
    });
    if (!backup?.storageKey)
      throw new NotFoundException('Backup no disponible localmente');
    const data = await readFile(this.safeStoragePath(backup.storageKey));
    await this.activity.log({
      empresaId: backup.empresaId,
      usuarioId: userId,
      modulo: 'BACKUPS',
      accion: 'DOWNLOAD',
      resourceId: id,
      resourceName: backup.nombreArchivo,
      resourceType: 'Backup',
    });
    return { name: basename(backup.nombreArchivo), data };
  }

  async remove(userId: string, id: string) {
    const backup = await this.prisma.backup.findFirst({
      where: { id, propietarioId: userId },
    });
    if (!backup) throw new NotFoundException('Backup no encontrado');
    if (backup.storageKey)
      await rm(this.safeStoragePath(backup.storageKey), { force: true });
    await this.prisma.backup.update({
      where: { id },
      data: { estado: 'DELETED', storageKey: null },
    });
    await this.activity.log({
      empresaId: backup.empresaId,
      usuarioId: userId,
      modulo: 'BACKUPS',
      accion: 'DELETE',
      resourceId: id,
      resourceName: backup.nombreArchivo,
      resourceType: 'Backup',
    });
    return { success: true };
  }

  async googleStatus(userId: string) {
    const connection = await this.prisma.googleDriveConnection.findUnique({
      where: { propietarioId: userId },
      select: {
        googleEmail: true,
        folderId: true,
        estado: true,
        creadoEn: true,
        actualizadoEn: true,
        ultimoError: true,
      },
    });
    return {
      connected: Boolean(connection && connection.estado === 'ACTIVE'),
      connection,
    };
  }

  googleAuthorize(userId: string) {
    const client = this.oauthClient();
    const state = randomBytes(32).toString('hex');
    this.oauthStates.set(state, {
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return {
      url: client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'openid',
          'email',
          'https://www.googleapis.com/auth/drive.file',
        ],
        state,
      }),
    };
  }

  async googleCallback(code: string, state: string) {
    const pending = this.oauthStates.get(state);
    this.oauthStates.delete(state);
    if (!pending || pending.expiresAt < Date.now())
      throw new BadRequestException('Estado OAuth expirado');
    const client = this.oauthClient();
    const { tokens } = await client.getToken(code);

    let refreshToken: string;
    if (tokens.refresh_token) {
      refreshToken = this.encryptSecret(tokens.refresh_token);
    } else {
      const existing = await this.prisma.googleDriveConnection.findUnique({
        where: { propietarioId: pending.userId },
      });
      if (existing?.refreshToken) {
        refreshToken = existing.refreshToken;
      } else {
        throw new BadRequestException(
          'Google no devolvió refresh token. Por favor intenta revocar el acceso y autorizar de nuevo.',
        );
      }
    }

    client.setCredentials(tokens);
    const profile = await google
      .oauth2({ version: 'v2', auth: client })
      .userinfo.get();

    await this.prisma.googleDriveConnection.upsert({
      where: { propietarioId: pending.userId },
      create: {
        propietarioId: pending.userId,
        googleEmail: profile.data.email,
        refreshToken,
      },
      update: {
        googleEmail: profile.data.email,
        refreshToken,
        estado: 'ACTIVE',
        ultimoError: null,
      },
    });
    return { success: true, email: profile.data.email };
  }

  async disconnectGoogle(userId: string) {
    await this.prisma.googleDriveConnection.deleteMany({
      where: { propietarioId: userId },
    });
    return { success: true };
  }

  async getSettings(userId: string, empresaId?: string) {
    if (!empresaId) throw new BadRequestException('Empresa activa requerida');
    await this.assertOwner(userId, empresaId);

    let config = await this.prisma.configuracionEmpresa.findUnique({
      where: { empresaId },
    });

    if (!config) {
      config = await this.prisma.configuracionEmpresa.create({
        data: {
          empresaId,
          backupAutoEnabled: false,
          backupFrecuencia: 'DAILY',
          backupHora: '02:00',
          backupDestino: 'LOCAL',
          backupRetencionDias: 7,
        },
      });
    }

    const driveStatus = await this.googleStatus(userId);

    return {
      backupAutoEnabled: Boolean(config.backupAutoEnabled),
      backupFrecuencia: config.backupFrecuencia || 'DAILY',
      backupHora: config.backupHora || '02:00',
      backupDestino: config.backupDestino || 'LOCAL',
      backupRetencionDias: config.backupRetencionDias ?? 7,
      ultimoBackupAuto: config.ultimoBackupAuto,
      googleDriveConnected: driveStatus.connected,
      googleEmail: driveStatus.connection?.googleEmail,
    };
  }

  async updateSettings(
    userId: string,
    empresaId: string | undefined,
    data: {
      backupAutoEnabled?: boolean;
      backupFrecuencia?: string;
      backupHora?: string;
      backupDestino?: string;
      backupRetencionDias?: number;
    },
  ) {
    if (!empresaId) throw new BadRequestException('Empresa activa requerida');
    await this.assertOwner(userId, empresaId);

    if (data.backupDestino === 'GOOGLE_DRIVE') {
      const drive = await this.googleStatus(userId);
      if (!drive.connected) {
        throw new BadRequestException(
          'Debes conectar Google Drive antes de seleccionarlo como destino de backups automáticos',
        );
      }
    }

    const config = await this.prisma.configuracionEmpresa.upsert({
      where: { empresaId },
      create: {
        empresaId,
        backupAutoEnabled: Boolean(data.backupAutoEnabled),
        backupFrecuencia: data.backupFrecuencia || 'DAILY',
        backupHora: data.backupHora || '02:00',
        backupDestino: data.backupDestino || 'LOCAL',
        backupRetencionDias:
          data.backupRetencionDias !== undefined
            ? Number(data.backupRetencionDias)
            : 7,
      },
      update: {
        backupAutoEnabled:
          data.backupAutoEnabled !== undefined
            ? Boolean(data.backupAutoEnabled)
            : undefined,
        backupFrecuencia: data.backupFrecuencia,
        backupHora: data.backupHora,
        backupDestino: data.backupDestino,
        backupRetencionDias:
          data.backupRetencionDias !== undefined
            ? Number(data.backupRetencionDias)
            : undefined,
      },
    });

    await this.activity.log({
      empresaId,
      usuarioId: userId,
      modulo: 'BACKUPS',
      accion: 'UPDATE_SETTINGS',
      resourceId: config.id,
      resourceName: 'Configuración de Copias de Seguridad Automáticas',
      resourceType: 'ConfiguracionEmpresa',
      metadata: data,
    });

    return this.getSettings(userId, empresaId);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleAutoBackupsCron() {
    try {
      const activeConfigs = await this.prisma.configuracionEmpresa.findMany({
        where: { backupAutoEnabled: true },
        include: {
          empresa: {
            select: {
              id: true,
              propietarioId: true,
              razonSocial: true,
            },
          },
        },
      });

      const now = new Date();
      const currentHour = now.getHours();
      const currentDayOfWeek = now.getDay(); // 0 = Sunday
      const currentDayOfMonth = now.getDate(); // 1..31

      for (const config of activeConfigs) {
        if (!config.empresa?.propietarioId) continue;

        // Parse configured execution hour (default 02:00)
        const [configHourStr] = (config.backupHora || '02:00').split(':');
        const configHour = parseInt(configHourStr, 10) || 2;

        if (currentHour !== configHour) {
          continue; // Not the scheduled hour
        }

        // Check frequency
        if (config.backupFrecuencia === 'WEEKLY' && currentDayOfWeek !== 0) {
          continue; // Only run on Sundays for WEEKLY
        }
        if (config.backupFrecuencia === 'MONTHLY' && currentDayOfMonth !== 1) {
          continue; // Only run on 1st of month for MONTHLY
        }

        // Avoid multiple runs within the last 12 hours
        if (config.ultimoBackupAuto) {
          const hoursSinceLast =
            (now.getTime() - new Date(config.ultimoBackupAuto).getTime()) /
            (1000 * 60 * 60);
          if (hoursSinceLast < 12) {
            continue;
          }
        }

        const provider = (config.backupDestino || 'LOCAL') as Provider;

        try {
          await this.create(
            config.empresa.propietarioId,
            config.empresaId,
            provider,
          );

          await this.prisma.configuracionEmpresa.update({
            where: { empresaId: config.empresaId },
            data: { ultimoBackupAuto: now },
          });

          // Apply retention policy for local backups
          if (config.backupRetencionDias && config.backupRetencionDias > 0) {
            await this.cleanExpiredBackups(
              config.empresa.propietarioId,
              config.empresaId,
              config.backupRetencionDias,
            );
          }
        } catch (err) {
          console.error(
            `[AutoBackup Error] Empresa ${config.empresa.razonSocial} (${config.empresaId}):`,
            err,
          );
        }
      }
    } catch (globalErr) {
      console.error('[AutoBackup Cron Error]:', globalErr);
    }
  }

  private async cleanExpiredBackups(
    userId: string,
    empresaId: string,
    retentionDays: number,
  ) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const expiredBackups = await this.prisma.backup.findMany({
      where: {
        empresaId,
        propietarioId: userId,
        proveedor: 'LOCAL',
        estado: 'COMPLETED',
        creadoEn: { lt: cutoffDate },
      },
    });

    for (const b of expiredBackups) {
      try {
        if (b.storageKey) {
          await rm(this.safeStoragePath(b.storageKey), { force: true });
        }
        await this.prisma.backup.update({
          where: { id: b.id },
          data: { estado: 'DELETED', storageKey: null },
        });
      } catch (err: any) {
        this.logger.warn(
          `Failed to cleanup expired backup ${b.id}: ${err.message}`,
        );
      }
    }
  }

  private async assertOwner(userId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { propietarioId: true },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    if (empresa.propietarioId !== userId)
      throw new ForbiddenException(
        'Los backups están disponibles solo para el propietario',
      );
  }

  private async exportTenant(empresaId: string) {
    const data: Record<string, unknown> = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      empresaId,
    };
    const prisma = this.prisma as any;
    for (const model of TENANT_MODELS) {
      data[model] = await prisma[model].findMany({
        where: { empresaId },
        ...(model === 'facturaVenta'
          ? {
              include: {
                impuestos: true,
                pagosAplicados: { include: { pago: true } },
              },
            }
          : {}),
      });
    }
    return Buffer.from(
      JSON.stringify(data, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  private async encrypt(plain: Buffer) {
    const compressed = await gzipAsync(plain);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.backupKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(compressed),
      cipher.final(),
    ]);
    return Buffer.concat([
      Buffer.from('DOLPHIN-BACKUP-V1\0'),
      iv,
      cipher.getAuthTag(),
      encrypted,
    ]);
  }

  private encryptSecret(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.backupKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      'base64',
    );
  }

  private backupKey() {
    const raw = process.env.BACKUP_ENCRYPTION_KEY?.trim();
    if (!raw)
      throw new ServiceUnavailableException(
        'BACKUP_ENCRYPTION_KEY no está configurada',
      );
    const key = /^[0-9a-f]{64}$/i.test(raw)
      ? Buffer.from(raw, 'hex')
      : Buffer.from(raw, 'base64');
    if (key.length !== 32)
      throw new ServiceUnavailableException(
        'BACKUP_ENCRYPTION_KEY debe contener 32 bytes',
      );
    return key;
  }

  private storageRoot() {
    return resolve(process.env.BACKUP_STORAGE_PATH || './var/backups');
  }

  private async saveLocal(
    userId: string,
    empresaId: string,
    id: string,
    data: Buffer,
  ) {
    const relative = join(userId, empresaId, `${id}.backup`);
    const target = this.safeStoragePath(relative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data, { mode: 0o600 });
    return relative;
  }

  private safeStoragePath(relative: string) {
    const root = this.storageRoot();
    const target = resolve(root, relative);
    if (
      target !== root &&
      !target.startsWith(root + String.fromCharCode(92)) &&
      !target.startsWith(`${root}/`)
    )
      throw new ForbiddenException('Ruta de backup inválida');
    return target;
  }

  private oauthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_DRIVE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri)
      throw new ServiceUnavailableException(
        'Google Drive OAuth no está configurado',
      );
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  private async uploadDrive(userId: string, name: string, data: Buffer) {
    const connection = await this.prisma.googleDriveConnection.findUnique({
      where: { propietarioId: userId },
    });
    if (!connection)
      throw new BadRequestException('Google Drive no está conectado');
    const client = this.oauthClient();
    client.setCredentials({
      refresh_token: this.decryptSecret(connection.refreshToken),
    });
    const drive = google.drive({ version: 'v3', auth: client });
    let folderId = connection.folderId;
    if (!folderId) {
      const folder = await drive.files.create({
        requestBody: {
          name: 'Dolphin ERP Backups',
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      folderId = folder.data.id || null;
      await this.prisma.googleDriveConnection.update({
        where: { propietarioId: userId },
        data: { folderId },
      });
    }
    const result = await drive.files.create({
      requestBody: {
        name,
        parents: folderId ? [folderId] : undefined,
        mimeType: 'application/octet-stream',
      },
      media: {
        mimeType: 'application/octet-stream',
        body: Readable.from(data),
      },
      fields: 'id',
    });
    return result.data.id || undefined;
  }

  private decryptSecret(value: string) {
    const data = Buffer.from(value, 'base64');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.backupKey(),
      data.subarray(0, 12),
    );
    decipher.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([
      decipher.update(data.subarray(28)),
      decipher.final(),
    ]).toString('utf8');
  }
}

function cryptoRandomId() {
  return randomBytes(8).toString('hex');
}
function safeError(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 500)
    : 'Error generando backup';
}
