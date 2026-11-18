import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// В dev-режиме фронтенд проксирует /api/* на бэкенд — см. README.
// Порты переопределяются через окружение: изолированный e2e-прогон
// Playwright поднимает свою пару серверов (:5273 → :3100), не трогая
// dev-серверы разработки на :5173/:3000 (см. playwright.config.js).
const clientPort = Number(process.env.CLIENT_PORT ?? 5173);
const apiPort = Number(process.env.API_PORT ?? 3000);

export default defineConfig({
  plugins: [react()],
  server: {
    // Явный IPv4-хост: иначе Vite слушает только ::1, а pitchfork
    // (mise daemons) проверяет готовность порта по 127.0.0.1
    host: '127.0.0.1',
    port: clientPort,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    // e2e/ — Playwright (см. playwright.config.js), Vitest их не берёт
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
