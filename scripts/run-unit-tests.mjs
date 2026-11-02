import { runNode } from './local-db.mjs';
await runNode(['--experimental-strip-types', '--test', 'tests/domain.test.ts']);
await runNode(['--require', 'ts-node/register', '--test', 'apps/api/src/auth/password.spec.ts', 'apps/api/src/auth/token-crypto.spec.ts', 'apps/api/src/workspaces/workspace.policy.spec.ts'], { TS_NODE_PROJECT: 'apps/api/tsconfig.json' });
