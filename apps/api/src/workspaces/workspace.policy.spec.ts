import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import type { WorkspaceRole } from '@prisma/client';
import { requireAssignableRole, requireManageableMember, requireWorkspaceAdmin } from './workspace.policy';

test('manager, member and viewer cannot administer workspace', () => {
  for (const role of ['MANAGER', 'MEMBER', 'VIEWER'] as WorkspaceRole[]) {
    assert.throws(() => requireWorkspaceAdmin(role), ForbiddenException);
    assert.throws(() => requireAssignableRole(role, 'VIEWER'), ForbiddenException);
  }
  assert.doesNotThrow(() => requireWorkspaceAdmin('OWNER'));
  assert.doesNotThrow(() => requireWorkspaceAdmin('ADMIN'));
});

test('owner can assign supported roles but cannot transfer ownership through role endpoint', () => {
  for (const role of ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as WorkspaceRole[]) {
    assert.doesNotThrow(() => requireAssignableRole('OWNER', role));
  }
  assert.throws(() => requireAssignableRole('OWNER', 'OWNER'), ForbiddenException);
});

test('admin cannot invite or promote another admin or owner', () => {
  assert.throws(() => requireAssignableRole('ADMIN', 'ADMIN'), ForbiddenException);
  assert.throws(() => requireAssignableRole('ADMIN', 'OWNER'), ForbiddenException);
  assert.doesNotThrow(() => requireAssignableRole('ADMIN', 'MANAGER'));
});

test('self membership and owner role are immutable', () => {
  assert.throws(() => requireManageableMember({ userId: 'owner', role: 'OWNER' }, { userId: 'owner', role: 'OWNER' }), ForbiddenException);
  assert.throws(() => requireManageableMember({ userId: 'owner', role: 'OWNER' }, { userId: 'other-owner', role: 'OWNER' }), ForbiddenException);
  assert.throws(() => requireManageableMember({ userId: 'admin-a', role: 'ADMIN' }, { userId: 'admin-b', role: 'ADMIN' }), ForbiddenException);
  assert.doesNotThrow(() => requireManageableMember({ userId: 'owner', role: 'OWNER' }, { userId: 'admin', role: 'ADMIN' }));
});
