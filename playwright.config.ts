import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5173', browserName: 'chromium' },
  webServer: {
    command:
      'npm run build:api && concurrently -k "node build/server/main.js" "vite"',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    env: { DB_PATH: ':memory:' },
    timeout: 60000,
  },
});
