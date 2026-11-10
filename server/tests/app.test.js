import request from 'supertest';
import app from '../src/app.js';
import { resetStore } from '../src/store.js';

// Состояние хранилища сбрасывается перед каждым тестом (см. README)
beforeEach(resetStore);

describe('smoke: приложение поднимается и отвечает', () => {
  test('GET /api/health возвращает 200 и { status: "ok" }', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
