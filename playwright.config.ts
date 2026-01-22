import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tools/qa_suite/tests',
  testMatch: '**/*.spec.ts', // Only run .spec.ts files (E2E)
  testIgnore: '**/*.test.ts', // Ignore .test.ts files (Unit)
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});