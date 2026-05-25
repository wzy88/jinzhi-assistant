import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(localChrome) ? localChrome : undefined)

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:5174',
    launchOptions: chromiumExecutable ? { executablePath: chromiumExecutable } : undefined,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
