import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password';

test('password hashing uses independent salts and verifies without plaintext storage', async () => {
  const password = 'Password-for-unit-test!';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(await verifyPassword(password, first));
  assert.equal(await verifyPassword('different-password', first), false);
  assert.equal(first.includes(password), false);
});
test('unknown and malformed accounts fail password verification', async () => {
  assert.equal(await verifyPassword('anything', undefined), false);
  assert.equal(await verifyPassword('anything', 'invalid:hash:value'), false);
});
