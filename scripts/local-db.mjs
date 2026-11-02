import EmbeddedPostgres from 'embedded-postgres';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export async function startDatabase({ test = false } = {}) {
  const directory = resolve(root, '.local', test ? `test-${randomUUID()}` : 'development');
  await mkdir(directory, { recursive: true });
  const configFile = resolve(directory, 'runtime.json');
  let config;
  try {
    config = JSON.parse(await readFile(configFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    config = { port: test ? 55433 : 55432, password: randomBytes(24).toString('hex') };
    await writeFile(configFile, JSON.stringify(config), { mode: 0o600 });
  }
  const pg = new EmbeddedPostgres({
    databaseDir: resolve(directory, 'postgres'),
    user: 'postgres', password: config.password, port: config.port,
    authMethod: 'scram-sha-256', persistent: true, createPostgresUser: false,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    postgresFlags: ['-h', '127.0.0.1'],
    onLog: () => {}, onError: () => {},
  });
  try { await access(resolve(directory, 'postgres', 'PG_VERSION')); }
  catch { console.log('Initializing local PostgreSQL...'); await pg.initialise(); }
  let databaseName = 'orbit';
  try {
    await pg.start();
    const client = pg.getPgClient('postgres', '127.0.0.1');
    await client.connect();
    try {
      const exists = await client.query("SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = 'orbit'");
      if (!exists.rows.length) await client.query("CREATE DATABASE orbit ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'");
      else if (exists.rows[0].encoding !== 'UTF8') {
        // Preserve any older database and switch to a separate UTF-8 database.
        databaseName = 'orbit_utf8';
        const utf8 = await client.query("SELECT 1 FROM pg_database WHERE datname = 'orbit_utf8'");
        if (!utf8.rows.length) await client.query("CREATE DATABASE orbit_utf8 ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'");
        console.log('Using UTF-8 database orbit_utf8; older orbit database is preserved.');
      }
    } finally { await client.end(); }
  } catch (error) { await pg.stop().catch(() => {}); throw error; }
  const databaseUrl = `postgresql://postgres:${config.password}@127.0.0.1:${config.port}/${databaseName}?schema=public`;
  return { databaseUrl, stop: () => pg.stop(), directory };
}

export function runNode(args, env = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolvePromise() : reject(new Error(`Command failed with exit code ${code}`)));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pg = await startDatabase();
  console.log('Local PostgreSQL ready on 127.0.0.1:55432. Data is persisted in .local/development.');
  console.log('Use pnpm dev:sp1 to start the complete application. Ctrl+C stops this database.');
  const keepAlive = setInterval(() => {}, 60000);
  const stop = async () => { clearInterval(keepAlive); await pg.stop(); process.exit(0); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
