import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -w @tcg-hobby/storefront',
      url: 'http://127.0.0.1:3000',
      env: {
        TCG_HOBBY_CATALOGUE_DATA_SOURCE: 'database',
      },
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -w @tcg-hobby/admin',
      url: 'http://127.0.0.1:3001/admin',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
