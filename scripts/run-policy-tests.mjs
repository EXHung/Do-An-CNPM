import { runNode } from './local-db.mjs';
await runNode(['--require', 'ts-node/register', '--test', 'apps/api/src/workspaces/workspace.policy.spec.ts'], { TS_NODE_PROJECT: 'apps/api/tsconfig.json' });
