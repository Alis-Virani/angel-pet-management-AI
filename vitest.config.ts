import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost'
      }
    },
    include: ['tests/emulator/**/*.test.tsx'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000
  }
});
