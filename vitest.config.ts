import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'], // Only run unit tests in src
    exclude: ['tools/**', 'tests/**', 'node_modules/**'],
    environment: 'node',
  },
});