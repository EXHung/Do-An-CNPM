import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, calculateProgress, rankBetween } from '../packages/contracts/domain.ts';

test('viewer and member cannot administer workspace', () => {
  assert.equal(can('VIEWER', 'task.write'), false);
  assert.equal(can('MEMBER', 'member.manage'), false);
  assert.equal(can('MANAGER', 'audit.read'), false);
  assert.equal(can('OWNER', 'member.manage'), true);
});
test('progress counts leaves only and uses positive estimates when complete', () => {
  assert.equal(calculateProgress([
    { id: 'parent', parentTaskId: null, status: 'DONE', estimateMinutes: 100 },
    { id: 'a', parentTaskId: 'parent', status: 'DONE', estimateMinutes: 30 },
    { id: 'b', parentTaskId: 'parent', status: 'TODO', estimateMinutes: 90 },
  ]), 25);
});
test('partial estimates fall back to count; cancelled and empty sets are excluded', () => {
  assert.equal(calculateProgress([]), 0);
  assert.equal(calculateProgress([
    { id: 'a', parentTaskId: null, status: 'DONE', estimateMinutes: 30 },
    { id: 'b', parentTaskId: null, status: 'TODO', estimateMinutes: null },
    { id: 'c', parentTaskId: null, status: 'CANCELLED', estimateMinutes: 60 },
  ]), 50);
});
test('ranking handles boundaries and rejects invalid neighbors', () => {
  assert.equal(rankBetween(null, null), 1024);
  assert.equal(rankBetween(1024, 2048), 1536);
  assert.equal(rankBetween(null, 1024), 0);
  assert.throws(() => rankBetween(3, 2));
  assert.throws(() => rankBetween(NaN, null));
  assert.throws(() => rankBetween(Number.MAX_VALUE, null));
});
