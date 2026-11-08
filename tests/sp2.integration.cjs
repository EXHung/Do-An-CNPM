const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('ts-node').register({ project: 'apps/api/tsconfig.json' });

test('SP2 projects and tasks against isolated real PostgreSQL', { timeout: 240000 }, async t => {
  const { startDatabase, runNode } = await import('../scripts/local-db.mjs');
  const postgres = await startDatabase({ test: true });
  process.env.DATABASE_URL = postgres.databaseUrl;
  process.env.AUTH_MODE = 'local';
  process.env.NODE_ENV = 'test';
  process.env.WEB_ORIGIN = 'http://localhost:3000';
  let app;
  try {
    await runNode(['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'packages/db/prisma/schema.prisma']);
    const { createApp } = require('../apps/api/src/main.ts');
    const { PrismaService } = require('../apps/api/src/database/prisma.service.ts');
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    const db = app.get(PrismaService);
    const base = `${await app.getUrl()}/api/v1`;
    async function request(path, method = 'GET', data, cookie) {
      const response = await fetch(base + path, { method, headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
      return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
    }
    const password = 'Orbit-study-2026!';
    async function register(name) {
      const result = await request('/auth/register', 'POST', { displayName: name, email: `${name}@example.test`, password });
      assert.equal(result.status, 201);
      return { ...result.body.user, cookie: result.cookie };
    }
    const owner = await register('owner');
    const manager = await register('manager');
    const member = await register('member');
    const viewer = await register('viewer');
    const outsider = await register('outsider');
    const workspace = (await request('/workspaces', 'POST', { name: 'Nhóm SP2', slug: 'nhom-sp2' }, owner.cookie)).body;
    const other = (await request('/workspaces', 'POST', { name: 'Nhóm khác', slug: 'nhom-khac' }, outsider.cookie)).body;
    const join = async (person, role) => {
      const invite = await request(`/workspaces/${workspace.id}/invitations`, 'POST', { email: person.email, role }, owner.cookie);
      assert.equal(invite.status, 201);
      assert.equal((await request('/invitations/accept', 'POST', { token: invite.body.inviteToken }, person.cookie)).status, 201);
    };
    await join(manager, 'MANAGER'); await join(member, 'MEMBER'); await join(viewer, 'VIEWER');
    const projects = `/workspaces/${workspace.id}/projects`;
    let project;
    let task;

    await t.test('manager creates a project; owner defaults to the creator and the key is generated', async () => {
      const created = await request(projects, 'POST', { name: 'Website bán hàng', startAt: '2026-11-03', targetAt: '2026-11-30' }, manager.cookie);
      assert.equal(created.status, 201);
      project = created.body;
      assert.equal(project.key, 'WBH'); assert.equal(project.owner.id, manager.id); assert.equal(project.status, 'PLANNED'); assert.equal(project.taskCount, 0);
      assert.equal(project.targetAt.slice(0, 10), '2026-11-30');
      const second = await request(projects, 'POST', { name: 'Web bán hoa' }, owner.cookie);
      assert.equal(second.body.key, 'WBH2');
    });
    await t.test('member and viewer cannot create or edit projects but can read them', async () => {
      assert.equal((await request(projects, 'POST', { name: 'Không được' }, member.cookie)).status, 403);
      assert.equal((await request(`${projects}/${project.id}`, 'PATCH', { name: 'Đổi', version: project.version }, viewer.cookie)).status, 403);
      const list = await request(projects, 'GET', undefined, viewer.cookie);
      assert.equal(list.status, 200); assert.equal(list.body.length, 2);
    });
    await t.test('outsider cannot see the workspace projects or tasks', async () => {
      assert.equal((await request(projects, 'GET', undefined, outsider.cookie)).status, 404);
      assert.equal((await request(`${projects}/${project.id}`, 'GET', undefined, outsider.cookie)).status, 404);
      assert.equal((await request(`/workspaces/${other.id}/projects/${project.id}`, 'GET', undefined, outsider.cookie)).status, 404);
      assert.equal((await request(`/workspaces/${other.id}/projects/${project.id}/tasks`, 'POST', { title: 'Lén' }, outsider.cookie)).status, 404);
      assert.equal((await request(projects, 'GET')).status, 401);
    });
    await t.test('project rejects a foreign owner, reversed dates and a stale version', async () => {
      const url = `${projects}/${project.id}`;
      assert.equal((await request(url, 'PATCH', { ownerId: outsider.id, version: project.version }, owner.cookie)).status, 400);
      assert.equal((await request(url, 'PATCH', { targetAt: '2026-11-01', version: project.version }, owner.cookie)).status, 400);
      const updated = await request(url, 'PATCH', { status: 'ACTIVE', ownerId: member.id, version: project.version }, owner.cookie);
      assert.equal(updated.status, 200); assert.equal(updated.body.version, project.version + 1); assert.equal(updated.body.owner.id, member.id);
      assert.equal((await request(url, 'PATCH', { name: 'Cũ', version: project.version }, manager.cookie)).status, 409);
      project = updated.body;
    });
    await t.test('member creates and assigns a task; viewer cannot', async () => {
      const url = `${projects}/${project.id}/tasks`;
      assert.equal((await request(url, 'POST', { title: 'Không được' }, viewer.cookie)).status, 403);
      assert.equal((await request(url, 'POST', { title: 'Sai người', assigneeId: outsider.id }, member.cookie)).status, 400);
      const created = await request(url, 'POST', { title: 'Thiết kế trang chủ', assigneeId: viewer.id, dueAt: '2026-11-10' }, member.cookie);
      assert.equal(created.status, 201);
      task = created.body;
      assert.equal(task.humanReadableKey, 'WBH-1'); assert.equal(task.assignee.id, viewer.id); assert.equal(task.dueAt.slice(0, 10), '2026-11-10'); assert.equal(task.status.type, 'TODO');
      const next = await request(url, 'POST', { title: 'Viết nội dung' }, manager.cookie);
      assert.equal(next.body.humanReadableKey, 'WBH-2');
      const list = await request(url, 'GET', undefined, viewer.cookie);
      assert.deepEqual(list.body.map(item => item.humanReadableKey), ['WBH-1', 'WBH-2']);
      assert.equal((await db.workflowStatus.count({ where: { workspaceId: workspace.id } })), 3);
      assert.equal((await request(`${projects}/${project.id}`, 'GET', undefined, viewer.cookie)).body.taskCount, 2);
    });
    await t.test('concurrent task creation gives unique keys and one status set', async () => {
      const results = await Promise.all(Array.from({ length: 6 }, (_, index) => request(`${projects}/${project.id}/tasks`, 'POST', { title: `Song song ${index}` }, owner.cookie)));
      assert.ok(results.every(result => result.status === 201));
      assert.equal(new Set(results.map(result => result.body.humanReadableKey)).size, 6);
      assert.equal(await db.workflowStatus.count({ where: { workspaceId: workspace.id } }), 3);
    });
    await t.test('my tasks shows only open work assigned to the caller', async () => {
      const mine = await request(`/workspaces/${workspace.id}/my-tasks`, 'GET', undefined, viewer.cookie);
      assert.equal(mine.status, 200); assert.deepEqual(mine.body.map(item => item.id), [task.id]);
      assert.equal(mine.body[0].project.name, 'Website bán hàng');
      assert.equal((await request(`/workspaces/${workspace.id}/my-tasks`, 'GET', undefined, outsider.cookie)).status, 404);
    });
    await t.test('task update checks version, workspace and audit stays in step', async () => {
      const url = `/workspaces/${workspace.id}/tasks/${task.id}`;
      assert.equal((await request(`/workspaces/${other.id}/tasks/${task.id}`, 'PATCH', { title: 'Lén', version: task.version }, outsider.cookie)).status, 404);
      assert.equal((await request(url, 'PATCH', { title: 'Không', version: task.version }, viewer.cookie)).status, 403);
      assert.equal((await request(url, 'PATCH', { assigneeId: outsider.id, version: task.version }, owner.cookie)).status, 400);
      const updated = await request(url, 'PATCH', { assigneeId: member.id, dueAt: null, description: 'Bản nháp', version: task.version }, manager.cookie);
      assert.equal(updated.status, 200); assert.equal(updated.body.assignee.id, member.id); assert.equal(updated.body.dueAt, null);
      assert.equal((await request(url, 'PATCH', { title: 'Cũ', version: task.version }, owner.cookie)).status, 409);
      task = updated.body;
      const audit = await db.auditLog.findMany({ where: { entityId: task.id } });
      assert.deepEqual(audit.map(row => row.action).sort(), ['task.assigned', 'task.created']);
      assert.equal(await db.outboxEvent.count({ where: { workspaceId: workspace.id, eventType: 'task.assigned' } }), 1);
    });
    await t.test('closed project refuses new tasks', async () => {
      const closed = await request(`${projects}/${project.id}`, 'PATCH', { status: 'COMPLETED', version: project.version }, owner.cookie);
      assert.equal(closed.status, 200);
      assert.equal((await request(`${projects}/${project.id}/tasks`, 'POST', { title: 'Muộn' }, owner.cookie)).status, 409);
      const reopened = await request(`${projects}/${project.id}`, 'PATCH', { status: 'ACTIVE', version: closed.body.version }, owner.cookie);
      project = reopened.body;
    });
    await t.test('removing a member clears their assignments and project ownership', async () => {
      const members = await request(`/workspaces/${workspace.id}/members`, 'GET', undefined, owner.cookie);
      const target = members.body.find(item => item.userId === member.id);
      assert.equal((await request(`/workspaces/${workspace.id}/members/${target.id}`, 'DELETE', undefined, owner.cookie)).status, 200);
      const after = await request(`/workspaces/${workspace.id}/tasks/${task.id}`, 'GET', undefined, owner.cookie);
      assert.equal(after.body.assignee, null); assert.equal(after.body.version, task.version + 1);
      assert.equal((await request(`${projects}/${project.id}`, 'GET', undefined, owner.cookie)).body.owner, null);
      task = after.body;
    });
    await t.test('delete requires the current version and hides the task', async () => {
      const url = `/workspaces/${workspace.id}/tasks/${task.id}`;
      assert.equal((await request(`${url}?version=${task.version + 5}`, 'DELETE', undefined, owner.cookie)).status, 409);
      assert.equal((await request(`${url}?version=${task.version}`, 'DELETE', undefined, viewer.cookie)).status, 403);
      assert.equal((await request(`${url}?version=${task.version}`, 'DELETE', undefined, manager.cookie)).status, 200);
      assert.equal((await request(url, 'GET', undefined, owner.cookie)).status, 404);
      assert.equal(await db.task.count({ where: { id: task.id } }), 1);
      const list = await request(`${projects}/${project.id}/tasks`, 'GET', undefined, owner.cookie);
      assert.ok(!list.body.some(item => item.id === task.id));
    });
    await t.test('input is validated and unknown ids stay hidden', async () => {
      assert.equal((await request(projects, 'POST', { name: 'X' }, owner.cookie)).status, 400);
      assert.equal((await request(projects, 'POST', { name: 'Có khóa', key: 'HACK' }, owner.cookie)).status, 400);
      assert.equal((await request(`${projects}/${project.id}/tasks`, 'POST', { title: 'Sai ngày', dueAt: '2026-13-40' }, owner.cookie)).status, 400);
      assert.equal((await request(`${projects}/${randomUUID()}`, 'GET', undefined, owner.cookie)).status, 404);
    });
  } finally {
    if (app) await app.close();
    await postgres.stop();
  }
});
