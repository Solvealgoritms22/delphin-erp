import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { Secret, TOTP } from 'otpauth';
import { MfaService } from '../src/modules/auth/mfa.service';
jest.setTimeout(30_000);

const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl && !/^dolphin_test_/.test(new URL(testUrl).pathname.slice(1))) {
  throw new Error('MFA integration tests require an isolated dolphin_test_ database');
}
const suite = testUrl ? describe : describe.skip;
suite('MFA persistence and concurrency (PostgreSQL)', () => {
  let db: PrismaClient;
  let service: MfaService;
  let user: any;
  let secret: string;
  let codes: string[];
  const previousKeys = process.env.SECRETS_ENCRYPTION_KEYS;
  beforeAll(async () => {
    process.env.SECRETS_ENCRYPTION_KEYS = JSON.stringify({ v1: randomBytes(32).toString('base64') });
    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    await db.$connect();
    service = new MfaService(db as any);
  });
  afterAll(async () => {
    await db?.$disconnect();
    if (previousKeys === undefined) delete process.env.SECRETS_ENCRYPTION_KEYS;
    else process.env.SECRETS_ENCRYPTION_KEYS = previousKeys;
  });
  beforeEach(async () => {
    const id = randomUUID();
    await db.usuario.create({ data: { id, email: id + '@example.invalid', passwordHash: '!test', isVerified: true } });
    user = { id, email: id + '@example.invalid', authTime: Math.floor(Date.now() / 1000), sessionId: randomUUID() };
    const setup = await service.setup(user);
    secret = setup.secret;
    expect(setup.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    const otp = new TOTP({ secret: Secret.fromBase32(secret) });
    const enabled = await service.manage(user, otp.generate({ timestamp: Date.now() - 30_000 }), 'enable');
    codes = enabled.recoveryCodes;
  });
  const current = () => new TOTP({ secret: Secret.fromBase32(secret) }).generate();

  it('encrypts the secret and stores only recovery hashes', async () => {
    const row = await db.mfaCredential.findUniqueOrThrow({ where: { usuarioId: user.id } });
    expect(row.secret).toMatch(/^enc:/);
    expect(row.secret).not.toContain(secret);
    expect(row.recoveryHashes).toHaveLength(10);
    expect(row.recoveryHashes).not.toContain(codes[0]);
    expect(await service.status(user.id)).toMatchObject({ enabled: true });
  });

  it('accepts only one concurrent verification of a TOTP and challenge', async () => {
    const challenge = await service.challenge(user);
    const code = current();
    const results = await Promise.allSettled([
      service.complete(challenge!.challengeToken, code),
      service.complete(challenge!.challengeToken, code),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(await db.userSession.count({ where: { usuarioId: user.id } })).toBe(0);
  });

  it('consumes a recovery code across different challenges', async () => {
    const a = await service.challenge(user), b = await service.challenge(user);
    const results = await Promise.allSettled([
      service.complete(a!.challengeToken, codes[0]), service.complete(b!.challengeToken, codes[0]),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await service.status(user.id)).recoveryCodesRemaining).toBe(9);
  });

  it('persists the account lock even when the request fails', async () => {
    const challenge = await service.challenge(user);
    for (let i = 0; i < 5; i++) await expect(service.complete(challenge!.challengeToken, 'bad')).rejects.toThrow();
    await expect(service.complete(challenge!.challengeToken, codes[0])).rejects.toThrow();
    const row = await db.mfaCredential.findUniqueOrThrow({ where: { usuarioId: user.id } });
    expect(row.failedAttempts).toBe(5);
    expect(row.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('revokes other sessions when disabling and leaves an audit record', async () => {
    await db.userSession.create({ data: { usuarioId: user.id, tokenHash: 'synthetic-' + randomUUID() } });
    await service.manage(user, codes[0], 'disable');
    expect((await service.status(user.id)).enabled).toBe(false);
    expect(await db.userSession.count({ where: { usuarioId: user.id, revokedAt: null } })).toBe(0);
    expect(await db.activityLog.count({ where: { usuarioId: user.id, accion: 'MFA_DISABLE' } })).toBe(1);
  });

  it('rejects enrollment from an old session', async () => {
    await expect(service.setup({ ...user, authTime: 1 })).rejects.toThrow('Vuelve a iniciar sesión');
  });
});
