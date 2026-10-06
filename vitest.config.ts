import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // We use env: {} to avoid passing Vite's default envs, but tests 
    // strictly read from process.env set by the shell.
    env: {},
  },
});
