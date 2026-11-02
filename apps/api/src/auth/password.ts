import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${(await derive(password, salt)).toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string | undefined): Promise<boolean> {
  // Derive even when the email does not exist so login failures do not skip password work.
  const [algorithm, salt, encoded] = (hash ?? 'scrypt:unknown-account:').split(':');
  const candidate = await derive(password, salt);
  if (algorithm !== 'scrypt' || !encoded || !/^[0-9a-f]{128}$/.test(encoded)) return false;
  return timingSafeEqual(candidate, Buffer.from(encoded, 'hex'));
}
