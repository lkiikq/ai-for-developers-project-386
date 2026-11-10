import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import healthRouter from './routes/health.js';
import eventTypesRouter from './routes/eventTypes.js';
import bookingsRouter from './routes/bookings.js';

// Сборка Express-приложения. Вынесена отдельно от запуска (index.js),
// чтобы в тестах можно было импортировать app без прослушивания порта.
const app = express();

app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/event-types', eventTypesRouter);
app.use('/api/bookings', bookingsRouter);

// Раздача собранного фронтенда в проде (см. README: бэкенд отдаёт
// client/dist и API на одном порту 3000). В dev-режиме фронтенд работает
// на Vite (:5173) и client/dist может отсутствовать — тогда статика
// не подключается.
const clientDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../client/dist',
);

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA-фолбэк: любой GET не к /api/* отдаёт index.html
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
