import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './local-db.mjs';

const store = resolve(root, 'node_modules', '.pnpm');
const packageDir = readdirSync(store).find(name => name.startsWith(`@embedded-postgres+${process.platform === 'win32' ? 'windows' : process.platform}-`));
if (!packageDir) throw new Error('embedded-postgres is not installed. Run pnpm install first.');
const platform = packageDir.slice('@embedded-postgres+'.length).split('@')[0];
const pgCtl = resolve(store, packageDir, 'node_modules', '@embedded-postgres', platform, 'native', 'bin', process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');
const dataDir = resolve(root, '.local', 'development', 'postgres');
if (!existsSync(resolve(dataDir, 'postmaster.pid'))) {
  console.log('Local PostgreSQL is not running.');
  process.exit(0);
}
const result = spawnSync(pgCtl, ['stop', '-D', dataDir, '-m', 'fast', '-w'], { stdio: 'inherit', windowsHide: true });
process.exit(result.status ?? 1);
