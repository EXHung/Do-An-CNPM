import assert from 'node:assert/strict';
import { test } from 'node:test';
import { can } from '../../../../packages/contracts/domain';
import type { Role } from '../../../../packages/contracts/domain';
import { projectKeyBase, uniqueProjectKey } from './project-key';
import { PROJECT_WRITERS, requireProjectWrite, requireTaskWrite, TASK_WRITERS } from './projects.policy';

const roles: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'];

test('API grants match the shared permission table', () => {
  for (const role of roles) {
    assert.equal(PROJECT_WRITERS.includes(role), can(role, 'project.write'), role);
    assert.equal(TASK_WRITERS.includes(role), can(role, 'task.write'), role);
  }
});

test('member cannot change projects and viewer cannot change tasks', () => {
  assert.throws(() => requireProjectWrite('MEMBER'));
  assert.doesNotThrow(() => requireProjectWrite('MANAGER'));
  assert.throws(() => requireTaskWrite('VIEWER'));
  assert.doesNotThrow(() => requireTaskWrite('MEMBER'));
});

test('project key is readable, unaccented and unique within the workspace', () => {
  assert.equal(projectKeyBase('Website bán hàng'), 'WBH');
  assert.equal(projectKeyBase('Đồ án'), 'DA');
  assert.equal(projectKeyBase('Marketing'), 'MARK');
  assert.equal(projectKeyBase('!'), 'DA');
  assert.equal(uniqueProjectKey('Đồ án', new Set(['DA', 'DA2'])), 'DA3');
});
