/**
 * Vitest konfiguratsiyasi
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node muhiti (server testlari uchun)
    environment: 'node',
    globals: true,

    // Test fayllari joylashuvi
    include: ['tests/**/*.test.{js,ts}', 'src/**/*.test.{js,ts}'],
    exclude: ['node_modules', 'dist'],

    // Coverage (npm run test:coverage)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/', '*.config.*'],
      thresholds: {
        // Minimal test qamrovi talablari
        lines: 50,
        functions: 50,
        branches: 40,
      },
    },

    // Har test faylidan oldin ishga tushiriladigan setup
    setupFiles: ['./tests/setup.js'],
  },
});
