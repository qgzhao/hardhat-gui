import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir:       './tests',
  timeout:       120_000,
  expect:        { timeout: 15_000 },
  fullyParallel: false,
  workers:       1,
  retries:       0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL:     'http://localhost:3099',
    viewport:    { width: 1280, height: 800 },
    permissions: ['clipboard-read', 'clipboard-write'],
  },

  globalSetup: './tests/global-setup.js',

  webServer: {
    command:              'node tests/start-test-server.js',
    url:                  'http://localhost:3099',
    reuseExistingServer:  true,
    timeout:              30_000,
  },

  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
