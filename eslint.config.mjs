import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', 'packages/contracts/api.generated.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { settings: { next: { rootDir: 'apps/web/' } } },
];
