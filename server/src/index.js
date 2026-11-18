import app from './app.js';

// Порт берётся из окружения: по умолчанию 3000 (dev-серверы и Docker),
// а изолированный e2e-прогон Playwright поднимает сервер на 3100
// (см. client/playwright.config.js), чтобы не писать тестовые данные
// в хранилище dev-сервера.
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
