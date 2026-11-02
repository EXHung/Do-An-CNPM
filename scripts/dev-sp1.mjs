import { spawn } from 'node:child_process';
import { startDatabase, runNode, root } from './local-db.mjs';

if (process.env.NODE_ENV === 'production') throw new Error('dev:sp1 is a local development command.');
let databaseReady = false;
process.once('exit', () => {
  if (!databaseReady) { console.error('Orbit stopped before PostgreSQL was ready.'); process.exitCode = 1; }
});
let database;
try {
  database = await startDatabase();
  databaseReady = true;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Cannot start PostgreSQL.');
  process.exit(1);
}
const apiPort = process.env.API_PORT ?? '4000';
const webPort = process.env.WEB_PORT ?? '3000';
const env = {
  DATABASE_URL: database.databaseUrl, AUTH_MODE: 'local', NODE_ENV: 'development',
  WEB_ORIGIN: `http://localhost:${webPort}`, PORT: apiPort,
  NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}/api/v1`,
};
const children = [];
let closing = false;
async function close(code = 0) {
  if (closing) return; closing = true;
  for (const child of children) child.kill('SIGTERM');
  await database.stop();
  process.exit(code);
}
process.once('SIGINT', () => void close());
process.once('SIGTERM', () => void close());
try {
  await runNode(['node_modules/prisma/build/index.js', 'generate', '--schema', 'packages/db/prisma/schema.prisma'], env);
  await runNode(['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'packages/db/prisma/schema.prisma'], env);
  for (const args of [
    ['node_modules/ts-node/dist/bin.js', '--project', 'apps/api/tsconfig.json', 'apps/api/src/main.ts'],
    ['node_modules/next/dist/bin/next', 'dev', 'apps/web', '--hostname', 'localhost', '--port', webPort],
  ]) {
    const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, stdio: 'inherit', windowsHide: true });
    children.push(child);
    child.once('error', () => void close(1));
    child.once('exit', () => { if (!closing) void close(1); });
  }
  console.log(`SP1 web: http://localhost:${webPort} | API: http://localhost:${apiPort}/api/v1`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Startup failed');
  await close(1);
}
