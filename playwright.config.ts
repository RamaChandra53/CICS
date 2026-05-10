import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.test.ts',
  // No browser needed for unit tests
  use: {},
  projects: [
    {
      name: 'unit',
      testDir: './tests/unit',
    },
  ],
});
