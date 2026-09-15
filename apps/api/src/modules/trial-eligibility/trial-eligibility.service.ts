import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';

@Injectable()
export class TrialEligibilityService {
  private readonly durationMs = 15 * 24 * 60 * 60 * 1000;

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  identityHash(email: string): string {
    const secret = process.env.TRIAL_IDENTITY_SECRET?.trim() || process.env.JWT_SECRET?.trim();
    if (!secret) throw new Error('TRIAL_IDENTITY_SECRET or JWT_SECRET must be configured');
    return createHmac('sha256', secret).update(this.normalizeEmail(email)).digest('hex');
  }

  async claimTrial(tx: any, email: string, userId: string, now = new Date()): Promise<boolean> {
    const identityHash = this.identityHash(email);
    const endsAt = new Date(now.getTime() + this.durationMs);
    const inserted = await tx.$executeRaw`
      INSERT INTO "trial_eligibilities"
        ("id", "identity_hash", "user_id", "trial_started_at", "trial_ends_at", "consumed_at", "created_at", "updated_at")
      VALUES
        (${randomUUID()}, ${identityHash}, ${userId}, ${now}, ${endsAt}, ${now}, ${now}, ${now})
      ON CONFLICT ("identity_hash") DO NOTHING
    `;
    return inserted === 1;
  }

  async recordConsumedOnDeletion(tx: any, email: string, userId: string, hadTrial: boolean, now = new Date()): Promise<void> {
    if (!hadTrial) return;
    const identityHash = this.identityHash(email);
    await tx.$executeRaw`
      INSERT INTO "trial_eligibilities"
        ("id", "identity_hash", "user_id", "consumed_at", "deleted_at", "created_at", "updated_at")
      VALUES
        (${randomUUID()}, ${identityHash}, ${userId}, ${now}, ${now}, ${now}, ${now})
      ON CONFLICT ("identity_hash") DO UPDATE SET
        "user_id" = EXCLUDED."user_id",
        "consumed_at" = COALESCE("trial_eligibilities"."consumed_at", EXCLUDED."consumed_at"),
        "deleted_at" = EXCLUDED."deleted_at",
        "updated_at" = EXCLUDED."updated_at"
    `;
  }

  async ensureTrialPlan(tx: any) {
    return tx.plan.upsert({
      where: { id: 'trial' },
      update: {},
      create: {
        id: 'trial',
        nombre: 'Trial Gratuito',
        descripcion: 'Prueba gratuita de 15 días con acceso completo.',
        precioMensual: 0,
        precioAnual: 0,
        maxUsuarios: 9999,
        maxSucursales: 9999,
        maxProductos: 999999,
      },
    });
  }
}