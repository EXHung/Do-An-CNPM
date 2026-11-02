const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
require('ts-node').register({ project: 'apps/api/tsconfig.json' });

test('SP1 integration against isolated real PostgreSQL', { timeout: 240000 }, async t => {
  const { startDatabase, runNode } = await import('../scripts/local-db.mjs');
  const postgres = await startDatabase({ test: true });
  process.env.DATABASE_URL = postgres.databaseUrl;
  process.env.AUTH_MODE = 'local';
  process.env.NODE_ENV = 'test';
  process.env.WEB_ORIGIN = 'http://localhost:3000';
  let app;
  let db;
  try {
    await runNode(['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'packages/db/prisma/schema.prisma']);
    const { createApp } = require('../apps/api/src/main.ts');
    const { PrismaService } = require('../apps/api/src/database/prisma.service.ts');
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    db = app.get(PrismaService);
    let base = `${await app.getUrl()}/api/v1`;
    async function request(path, method = 'GET', data, cookie, headers = {}) {
      const response = await fetch(base + path, { method, headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: data === undefined ? undefined : JSON.stringify(data) });
      return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
    }
    const password = 'Orbit-study-2026!';
    async function register(name) {
      const result = await request('/auth/register', 'POST', { displayName: name, email: `${name}@example.test`, password });
      assert.equal(result.status, 201); assert.ok(result.cookie);
      return { ...result.body.user, cookie: result.cookie };
    }
    const owner = await register('owner');
    const viewer = await register('viewer');
    const admin = await register('admin');
    const outsider = await register('outsider');
    const manager = await register('manager');
    const memberUser = await register('member');
    await t.test('database uses UTF-8 and supports full Vietnamese names', async () => {
      const encoding = await db.$queryRawUnsafe('SHOW server_encoding');
      assert.equal(encoding[0].server_encoding, 'UTF8');
      const person = await request('/auth/register', 'POST', { displayName: 'Nguyễn Trường Hưng', email: 'tiengviet@example.test', password });
      assert.equal(person.status, 201); assert.equal(person.body.user.displayName, 'Nguyễn Trường Hưng');
    });
    let workspace;
    let ownerMember;
    let viewerMember;
    let adminMember;

    await t.test('unauthenticated and forged identity headers cannot access protected routes', async () => {
      for (const path of ['/me', '/workspaces']) {
        const response = await request(path, 'GET', undefined, undefined, { 'x-user-id': owner.id, 'x-user-role': 'OWNER' });
        assert.equal(response.status, 401); assert.equal(response.body.code, 'UNAUTHORIZED'); assert.ok(response.body.requestId);
      }
      assert.equal((await request('/tasks')).status, 404);
    });
    await t.test('session cookie is HttpOnly SameSite; password and session are stored as hashes', async () => {
      const login = await request('/auth/login', 'POST', { email: owner.email.toUpperCase(), password });
      assert.equal(login.status, 200);
      assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
      assert.match(login.headers.get('set-cookie'), /SameSite=Lax/i);
      assert.match(login.headers.get('set-cookie'), /Path=\/api\/v1/);
      const credential = await db.passwordAccount.findUniqueOrThrow({ where: { userId: owner.id } });
      assert.match(credential.passwordHash, /^scrypt:/); assert.notEqual(credential.passwordHash, password);
      const rawToken = owner.cookie.split('=')[1];
      const session = await db.session.findUniqueOrThrow({ where: { tokenHash: createHash('sha256').update(rawToken).digest('hex') } });
      assert.notEqual(session.tokenHash, rawToken);
      assert.equal(JSON.stringify(login.body).includes('passwordHash'), false);
    });
    await t.test('validation, duplicate registration and bad credentials return real error statuses', async () => {
      assert.equal((await request('/auth/register', 'POST', { displayName: 'X', email: 'invalid', password: 'short' })).status, 400);
      assert.equal((await request('/auth/register', 'POST', { displayName: 'Duplicate', email: owner.email, password })).status, 409);
      assert.equal((await request('/auth/login', 'POST', { email: owner.email, password: 'incorrect-password' })).status, 401);
      assert.equal((await request('/auth/login', 'POST', { email: 'unknown@example.test', password: 'incorrect-password' })).status, 401);
    });
    await t.test('create workspace stores owner, audit and outbox atomically', async () => {
      const response = await request('/workspaces', 'POST', { name: 'Nhóm SP1', slug: 'nhom-sp1', description: 'Database integration' }, owner.cookie);
      assert.equal(response.status, 201); workspace = response.body;
      assert.equal(workspace.role, 'OWNER'); assert.equal(workspace.version, 1);
      const members = await request(`/workspaces/${workspace.id}/members`, 'GET', undefined, owner.cookie);
      ownerMember = members.body[0]; assert.equal(ownerMember.userId, owner.id);
      assert.equal(await db.auditLog.count({ where: { workspaceId: workspace.id } }), 1);
      assert.equal(await db.outboxEvent.count({ where: { workspaceId: workspace.id } }), 1);
    });
    await t.test('outsider cannot enumerate another workspace, members, invitations or audit', async () => {
      assert.deepEqual((await request('/workspaces', 'GET', undefined, outsider.cookie)).body, []);
      for (const suffix of ['', '/members', '/invitations', '/audit']) assert.equal((await request(`/workspaces/${workspace.id}${suffix}`, 'GET', undefined, outsider.cookie)).status, 404);
      assert.equal((await request(`/workspaces/${workspace.id}`, 'PATCH', { name: 'Hack', description: '', version: 1 }, outsider.cookie)).status, 404);
    });
    async function invite(user, role) {
      const result = await request(`/workspaces/${workspace.id}/invitations`, 'POST', { email: user.email, role }, owner.cookie);
      assert.equal(result.status, 201);
      const stored = await db.invitation.findUniqueOrThrow({ where: { id: result.body.id } });
      assert.notEqual(stored.tokenHash, result.body.inviteToken);
      const accepted = await request('/invitations/accept', 'POST', { token: result.body.inviteToken }, user.cookie);
      assert.equal(accepted.status, 201); assert.equal(accepted.body.role, role);
      return result.body;
    }
    let usedInvite;
    await t.test('all five roles can join with email-bound invitations', async () => {
      usedInvite = await invite(viewer, 'VIEWER');
      await invite(admin, 'ADMIN'); await invite(manager, 'MANAGER'); await invite(memberUser, 'MEMBER');
      const response = await request(`/workspaces/${workspace.id}/members`, 'GET', undefined, owner.cookie);
      assert.equal(response.body.length, 5);
      viewerMember = response.body.find(item => item.userId === viewer.id);
      adminMember = response.body.find(item => item.userId === admin.id);
    });
    await t.test('invitation is single use, email-bound and absent from list responses', async () => {
      assert.equal((await request('/invitations/accept', 'POST', { token: usedInvite.inviteToken }, viewer.cookie)).status, 404);
      const result = await request(`/workspaces/${workspace.id}/invitations`, 'POST', { email: outsider.email, role: 'MEMBER' }, owner.cookie);
      assert.equal(result.status, 201);
      assert.equal((await request('/invitations/accept', 'POST', { token: result.body.inviteToken }, viewer.cookie)).status, 403);
      const pending = await request(`/workspaces/${workspace.id}/invitations`, 'GET', undefined, owner.cookie);
      assert.equal(JSON.stringify(pending.body).includes('token'), false);
      assert.equal((await request(`/workspaces/${workspace.id}/invitations/${result.body.id}`, 'DELETE', undefined, owner.cookie)).status, 200);
      assert.equal((await request('/invitations/accept', 'POST', { token: result.body.inviteToken }, outsider.cookie)).status, 404);
    });
    await t.test('Viewer, Member and Manager have read access but no workspace administration', async () => {
      for (const user of [viewer, memberUser, manager]) {
        assert.equal((await request(`/workspaces/${workspace.id}/members`, 'GET', undefined, user.cookie)).status, 200);
        assert.equal((await request(`/workspaces/${workspace.id}`, 'PATCH', { name: 'Forbidden', description: '', version: 1 }, user.cookie, { 'x-user-role': 'OWNER' })).status, 403);
        assert.equal((await request(`/workspaces/${workspace.id}/invitations`, 'POST', { email: outsider.email, role: 'MEMBER' }, user.cookie)).status, 403);
        assert.equal((await request(`/workspaces/${workspace.id}/audit`, 'GET', undefined, user.cookie)).status, 403);
      }
    });
    await t.test('Owner is immutable and Admin cannot elevate to Admin or manage self/Owner', async () => {
      assert.equal((await request(`/workspaces/${workspace.id}/members/${ownerMember.id}`, 'DELETE', undefined, admin.cookie)).status, 403);
      assert.equal((await request(`/workspaces/${workspace.id}/members/${ownerMember.id}`, 'PATCH', { role: 'MEMBER' }, owner.cookie)).status, 403);
      assert.equal((await request(`/workspaces/${workspace.id}/members/${adminMember.id}`, 'PATCH', { role: 'MANAGER' }, admin.cookie)).status, 403);
      assert.equal((await request(`/workspaces/${workspace.id}/members/${viewerMember.id}`, 'PATCH', { role: 'ADMIN' }, admin.cookie)).status, 403);
      assert.equal((await request(`/workspaces/${workspace.id}/invitations`, 'POST', { email: outsider.email, role: 'ADMIN' }, admin.cookie)).status, 403);
    });
    await t.test('Owner can change member role and membership is scoped to workspace', async () => {
      assert.equal((await request(`/workspaces/${workspace.id}/members/${viewerMember.id}`, 'PATCH', { role: 'MEMBER' }, owner.cookie)).status, 200);
      assert.equal((await request(`/workspaces/${workspace.id}/members/${viewerMember.id}`, 'PATCH', { role: 'VIEWER' }, owner.cookie)).status, 200);
      const other = await request('/workspaces', 'POST', { name: 'Workspace khác', slug: 'workspace-khac' }, outsider.cookie);
      assert.equal((await request(`/workspaces/${other.body.id}/members/${viewerMember.id}`, 'PATCH', { role: 'ADMIN' }, outsider.cookie)).status, 404);
    });
    await t.test('workspace optimistic concurrency accepts one writer and rejects stale version', async () => {
      const attempts = await Promise.all(['First', 'Second'].map(name => request(`/workspaces/${workspace.id}`, 'PATCH', { name, description: 'updated', version: 1 }, owner.cookie)));
      assert.deepEqual(attempts.map(r => r.status).sort(), [200, 409]);
      const current = await request(`/workspaces/${workspace.id}`, 'GET', undefined, owner.cookie);
      assert.equal(current.body.version, 2); workspace = current.body;
      const count = await db.auditLog.count({ where: { workspaceId: workspace.id, action: 'workspace.updated' } }); assert.equal(count, 1);
    });
    await t.test('outbox failure rolls back workspace update and its audit write in actual database', async () => {
      await db.$executeRawUnsafe(`CREATE FUNCTION reject_test_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.payload->>'name' = 'Rollback check' THEN RAISE EXCEPTION 'test failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe('CREATE TRIGGER test_outbox_failure BEFORE INSERT ON "OutboxEvent" FOR EACH ROW EXECUTE FUNCTION reject_test_outbox()');
      const before = await db.auditLog.count();
      const result = await request(`/workspaces/${workspace.id}`, 'PATCH', { name: 'Rollback check', description: '', version: workspace.version }, owner.cookie);
      assert.equal(result.status, 500);
      const after = await request(`/workspaces/${workspace.id}`, 'GET', undefined, owner.cookie);
      assert.equal(after.body.version, workspace.version); assert.equal(after.body.name, workspace.name);
      assert.equal(await db.auditLog.count(), before);
      await db.$executeRawUnsafe('DROP TRIGGER test_outbox_failure ON "OutboxEvent"');
      await db.$executeRawUnsafe('DROP FUNCTION reject_test_outbox()');
    });
    await t.test('expired invitations and concurrent duplicate accept cannot create duplicate membership', async () => {
      const result = await request(`/workspaces/${workspace.id}/invitations`, 'POST', { email: outsider.email, role: 'MEMBER' }, owner.cookie);
      await db.invitation.update({ where: { id: result.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await request('/invitations/accept', 'POST', { token: result.body.inviteToken }, outsider.cookie)).status, 404);
      const next = await request(`/workspaces/${workspace.id}/invitations`, 'POST', { email: outsider.email, role: 'MEMBER' }, owner.cookie);
      const claims = await Promise.all([1, 2].map(() => request('/invitations/accept', 'POST', { token: next.body.inviteToken }, outsider.cookie)));
      assert.deepEqual(claims.map(r => r.status).sort(), [201, 404]);
      assert.equal(await db.workspaceMember.count({ where: { workspaceId: workspace.id, userId: outsider.id } }), 1);
    });
    await t.test('removed member loses access immediately even with an existing session', async () => {
      const result = await request(`/workspaces/${workspace.id}/members/${viewerMember.id}`, 'DELETE', undefined, owner.cookie);
      assert.equal(result.status, 200);
      assert.equal((await request(`/workspaces/${workspace.id}`, 'GET', undefined, viewer.cookie)).status, 404);
      assert.equal((await request('/me', 'GET', undefined, viewer.cookie)).status, 200);
    });
    await t.test('untrusted database roles cannot bypass the API through direct table access', async () => {
      await db.$executeRawUnsafe('CREATE ROLE orbit_untrusted NOLOGIN');
      await db.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO orbit_untrusted');
      await db.$executeRawUnsafe('GRANT SELECT ON ALL TABLES IN SCHEMA public TO orbit_untrusted');
      await db.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE orbit_untrusted');
        const workspaceRows = await tx.$queryRawUnsafe('SELECT count(*) AS count FROM "Workspace"');
        const sessionRows = await tx.$queryRawUnsafe('SELECT count(*) AS count FROM "Session"');
        assert.equal(workspaceRows[0].count, 0n); assert.equal(sessionRows[0].count, 0n);
      });
    });
    await t.test('pending invitation fails if issuer is demoted before acceptance', async () => {
      const target = await register('invited-after-demotion');
      const result = await request(`/workspaces/${workspace.id}/invitations`, 'POST', { email: target.email, role: 'MEMBER' }, admin.cookie);
      assert.equal(result.status, 201);
      assert.equal((await request(`/workspaces/${workspace.id}/members/${adminMember.id}`, 'PATCH', { role: 'MEMBER' }, owner.cookie)).status, 200);
      assert.equal((await request('/invitations/accept', 'POST', { token: result.body.inviteToken }, target.cookie)).status, 403);
      assert.equal((await request(`/workspaces/${workspace.id}/invitations`, 'POST', { email: target.email, role: 'MEMBER' }, admin.cookie)).status, 403);
    });
    await t.test('audit and outbox are consistent and contain no invite/session secrets', async () => {
      const audit = await request(`/workspaces/${workspace.id}/audit`, 'GET', undefined, owner.cookie);
      assert.equal(audit.status, 200); assert.ok(audit.body.some(item => item.action === 'member.removed'));
      const stored = await db.outboxEvent.findMany({ where: { workspaceId: workspace.id } });
      assert.equal(stored.length, audit.body.length);
      assert.equal(JSON.stringify([stored, audit.body]).includes(usedInvite.inviteToken), false);
    });
    await t.test('cross-origin mutation is rejected', async () => {
      assert.equal((await request('/workspaces', 'POST', { name: 'Rejected', slug: 'rejected' }, owner.cookie, { Origin: 'https://untrusted.example' })).status, 403);
    });
    await t.test('workspace and login session persist across API restart', async () => {
      await app.close();
      app = await createApp(); await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/v1`; db = app.get(PrismaService);
      assert.equal((await request('/me', 'GET', undefined, owner.cookie)).body.user.id, owner.id);
      assert.ok((await request('/workspaces', 'GET', undefined, owner.cookie)).body.some(w => w.id === workspace.id));
    });
    await t.test('expired and logged-out cookies cannot be reused', async () => {
      const result = await request('/auth/login', 'POST', { email: viewer.email, password });
      const raw = result.cookie.split('=')[1];
      await db.session.update({ where: { tokenHash: createHash('sha256').update(raw).digest('hex') }, data: { expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await request('/me', 'GET', undefined, result.cookie)).status, 401);
      assert.equal((await request('/auth/logout', 'POST', undefined, owner.cookie)).status, 200);
      assert.equal((await request('/me', 'GET', undefined, owner.cookie)).status, 401);
    });
    await t.test('invitation email goes through SMTP and failures are reported, not hidden', async () => {
      const { SMTPServer } = require('smtp-server');
      const ownerCookie = (await request('/auth/login', 'POST', { email: owner.email, password })).cookie;
      const messages = [];
      const smtp = new SMTPServer({
        authOptional: false, allowInsecureAuth: true, disabledCommands: ['STARTTLS'], logger: false,
        onAuth(auth, session, done) { done(auth.username === 'orbit@example.test' && auth.password === 'app-password' ? null : new Error('Bad credentials'), { user: auth.username }); },
        onData(stream, session, done) {
          let raw = '';
          stream.setEncoding('utf8');
          stream.on('data', chunk => { raw += chunk; });
          stream.on('end', () => { messages.push({ from: session.envelope.mailFrom.address, to: session.envelope.rcptTo.map(item => item.address), raw }); done(); });
        },
      });
      await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
      Object.assign(process.env, { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.server.address().port), SMTP_USER: 'orbit@example.test', SMTP_PASS: 'app-password' });
      try {
        const sent = await request(`/workspaces/${workspace.id}/invitations`, 'POST', { email: 'mail-ok@example.test', role: 'VIEWER' }, ownerCookie);
        assert.equal(sent.status, 201); assert.equal(sent.body.emailDelivery, 'SENT');
        assert.equal(messages.length, 1);
        assert.equal(messages[0].from, 'orbit@example.test');
        assert.deepEqual(messages[0].to, ['mail-ok@example.test']);
        const decoded = [messages[0].raw.replace(/=\r?\n/g, ''), ...messages[0].raw.split(/\r?\n\r?\n/).map(block => block.replace(/\s/g, '')).filter(block => /^[A-Za-z0-9+/=]+$/.test(block)).map(block => Buffer.from(block, 'base64').toString('utf8'))].join('\n');
        assert.match(decoded, new RegExp(`localhost:3000/#invite=(3D)?${sent.body.inviteToken}`));
        process.env.SMTP_PASS = 'wrong-password';
        const failed = await request(`/workspaces/${workspace.id}/invitations`, 'POST', { email: 'mail-fail@example.test', role: 'VIEWER' }, ownerCookie);
        assert.equal(failed.status, 201); assert.equal(failed.body.emailDelivery, 'FAILED'); assert.ok(failed.body.inviteToken);
        assert.equal(messages.length, 1);
        const events = await db.auditLog.findMany({ where: { entityId: { in: [sent.body.id, failed.body.id] } } });
        assert.ok(events.some(event => event.entityId === sent.body.id && event.action === 'invitation.email_sent'));
        assert.ok(events.some(event => event.entityId === failed.body.id && event.action === 'invitation.email_failed'));
        assert.ok(!JSON.stringify(events).includes(sent.body.inviteToken));
        const outbox = await db.outboxEvent.findMany({ where: { workspaceId: workspace.id } });
        assert.ok(!JSON.stringify(outbox).includes(sent.body.inviteToken));
        await db.invitation.deleteMany({ where: { id: { in: [sent.body.id, failed.body.id] } } });
      } finally {
        for (const name of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']) delete process.env[name];
        await new Promise(resolve => smtp.close(resolve));
      }
    });
    await t.test('login limit is stored per email in the database without the raw email', async () => {
      await db.authAttempt.deleteMany();
      const body = { email: 'limit-target@example.test', password: 'Wrong-password-1' };
      for (let index = 0; index < 10; index++) assert.equal((await request('/auth/login', 'POST', body)).status, 401);
      assert.equal((await request('/auth/login', 'POST', body)).status, 429);
      const rows = await db.authAttempt.findMany();
      assert.ok(rows.length >= 2);
      assert.ok(rows.every(row => /^[a-f0-9]{64}$/.test(row.key)));
      await db.authAttempt.updateMany({ data: { windowEndsAt: new Date(Date.now() - 1000) } });
      assert.equal((await request('/auth/login', 'POST', body)).status, 401);
      await db.authAttempt.deleteMany();
    });
    await t.test('signing in removes expired sessions', async () => {
      const staleHash = 'f'.repeat(64);
      await db.session.create({ data: { userId: owner.id, tokenHash: staleHash, expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await request('/auth/login', 'POST', { email: 'owner@example.test', password })).status, 200);
      assert.equal(await db.session.count({ where: { tokenHash: staleHash } }), 0);
      await db.authAttempt.deleteMany();
    });
    await t.test('auth rate limit returns 429', async () => {
      let last;
      for (let index = 0; index < 31; index++) last = await request('/auth/login', 'POST', {});
      assert.equal(last.status, 429); assert.equal(last.body.code, 'RATE_LIMITED');
    });
    await t.test('local authentication cannot be enabled in production', async () => {
      const { AuthService } = require('../apps/api/src/auth/auth.service.ts');
      process.env.NODE_ENV = 'production';
      try { assert.throws(() => new AuthService(db), /Local auth/); }
      finally { process.env.NODE_ENV = 'test'; }
    });
  } finally {
    if (app) await app.close();
    await postgres.stop();
  }
});
