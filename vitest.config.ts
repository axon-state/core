import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    alias: {
      // This tells Vitest: "Whenever you see this alias, look here instead"
      '@ngx-axon/core': path.resolve(__dirname, './projects/axon/src/public-api.ts')
    }
  }
});