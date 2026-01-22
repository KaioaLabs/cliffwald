import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          decoratorMetadata: true,
          legacyDecorator: true,
        },
      },
    }),
  ],
  test: {
    // Include the new centralized unit test location
    include: ['tools/qa_suite/tests/unit/**/*.test.ts', 'tools/qa_suite/tests/unit/**/*.test.mts', 'src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'dist-server/**'],
    environment: 'node',
    setupFiles: ['./tools/qa_suite/tests/setup.ts']
  },
});