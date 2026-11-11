import { defineConfig } from '@playwright/test';

// Браузерный e2e-тест (тикет #12). webServer сам поднимает настоящий
// бэкенд (:3000) и фронтенд dev (:5173) — API бронирования не подменяется,
// моков и перехватов в тесте нет. Порт бэкенда жёстко 3000 (server/src/index.js),
// фронтенд — Vite dev на 127.0.0.1:5173 с прокси /api → 3000.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Без HTML-отчёта: list-репортер, чтобы check не оставлял артефактов
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
  webServer: [
    {
      command: 'node ../server/src/index.js',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
