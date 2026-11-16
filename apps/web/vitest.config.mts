import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Testes de componentes/lógica do web (docs/testing/test-strategy.md).
// E2E de navegador fica para quando houver fluxo crítico a cobrir ponta a ponta.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
