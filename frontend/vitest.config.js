import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    exclude: ['**/node_modules/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/__tests__/**', 'src/test/**', 'src/main.jsx'],
      // lcov is what SonarCloud imports; json-summary feeds the CI run summary.
      reporter: ['text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
});
