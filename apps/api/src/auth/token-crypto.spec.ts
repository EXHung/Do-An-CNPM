import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { decryptToken, encryptToken, readEncryptionKey } from './token-crypto';

const key = randomBytes(32);

test('provider token round-trips and is not stored in plain text', () => {
  const stored = encryptToken('provider-secret', key);
  assert.ok(!stored.includes('provider-secret'));
  assert.notEqual(stored, encryptToken('provider-secret', key));
  assert.equal(decryptToken(stored, key), 'provider-secret');
});

test('tampered, foreign-key and legacy plain tokens are rejected', () => {
  const stored = encryptToken('provider-secret', key);
  const last = stored.at(-1) === 'A' ? 'B' : 'A';
  assert.equal(decryptToken(stored.slice(0, -1) + last, key), null);
  assert.equal(decryptToken(stored, randomBytes(32)), null);
  assert.equal(decryptToken('legacy.plain.access.token.value', key), null);
  assert.equal(decryptToken('plain', key), null);
});

test('encryption key must be exactly 32 bytes of base64', () => {
  assert.equal(readEncryptionKey(key.toString('base64')).length, 32);
  assert.throws(() => readEncryptionKey(undefined), /SESSION_ENCRYPTION_KEY/);
  assert.throws(() => readEncryptionKey('c2hvcnQ='), /SESSION_ENCRYPTION_KEY/);
});
