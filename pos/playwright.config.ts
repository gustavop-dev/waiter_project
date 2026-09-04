import { defineConfig, devices } from '@playwright/test';

// Solo levanta Next: Odoo viene del compose (odoo/compose) y debe estar arriba.
// El reporter de cobertura de flujos de la plantilla vuelve cuando exista e2e/flow-definitions.json.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'e2e-results/results.json' }]],
  webServer: {
    command: 'npm run dev -- --port 3000',
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } }],
});
