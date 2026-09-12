import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Supply the key ring through the deployment secret manager. Old key IDs remain
// readable during rotation; new writes always use SECRETS_ACTIVE_KEY_ID.
function key(id: string): Buffer {
  const ring = JSON.parse(
    process.env.SECRETS_ENCRYPTION_KEYS || '{}',
  ) as Record<string, string>;
  const value = ring[id];
  const bytes = Buffer.from(value || '', 'base64');
  if (bytes.length !== 32)
    throw new Error(
      'Configure SECRETS_ENCRYPTION_KEYS with 32-byte base64 keys',
    );
  return bytes;
}
export function encryptSecret(value: string): string {
  const id = process.env.SECRETS_ACTIVE_KEY_ID || 'v1';
  if (!/^[a-zA-Z0-9_-]+$/.test(id))
    throw new Error('Invalid encryption key ID');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(id), iv);
  cipher.setAAD(Buffer.from('dolphin:secret:' + id));
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  return [
    'enc',
    id,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}
export function decryptSecret(value: string | null | undefined): string {
  if (!value) return '';
  if (!value.startsWith('enc:')) {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_LEGACY_PLAINTEXT_SECRETS !== 'true'
    ) {
      throw new Error('Legacy plaintext secret requires migration');
    }
    return value;
  }
  const [prefix, id, iv, tag, ciphertext, extra] = value.split(':');
  if (prefix !== 'enc' || !id || !iv || !tag || !ciphertext || extra)
    throw new Error('Invalid encrypted secret');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(id),
    Buffer.from(iv, 'base64'),
  );
  decipher.setAAD(Buffer.from('dolphin:secret:' + id));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
