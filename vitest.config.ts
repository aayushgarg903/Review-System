import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Disable automatic .env loading to prevent production credentials
    // from leaking into the test environment.
    env: {},
  },
});
