import { defineConfig } from 'vitest/config';

// Tests live next to code (*.test.ts in src/), Node environment, no network.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
