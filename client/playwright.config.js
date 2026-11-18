import { defineConfig } from '@playwright/test';

// Браузерный e2e-тест (тикет #12). webServer сам поднимает настоящий
// бэкенд и фронтенд dev — API бронирования не подменяется, моков и
// перехватов в тесте нет.
// Порты изолированы от dev-серверов разработки (:3000/:5173): бэкенд на
// 3100 (PORT), фронтенд на 5273 (CLIENT_PORT, прокси /api → API_PORT).
// Иначе прогон пишет тестовые данные («Тип E2E…») в хранилище dev-сервера.
// reuseExistingServer выключен: свежая пара серверов на каждый прогон.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Без HTML-отчёта: list-репортер, чтобы check не оставлял артефактов
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5273',
  },
  webServer: [
    {
      command: 'node ../server/src/index.js',
      env: { PORT: '3100' },
      url: 'http://127.0.0.1:3100/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      env: { CLIENT_PORT: '5273', API_PORT: '3100' },
      url: 'http://127.0.0.1:5273',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
