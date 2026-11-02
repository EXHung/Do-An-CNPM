import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3100', browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: 'node scripts/dev-sp1.mjs',
    url: 'http://localhost:4100/api/v1/health',
    timeout: 120000,
    reuseExistingServer: false,
    env: { API_PORT: '4100', WEB_PORT: '3100' },
  },
});
