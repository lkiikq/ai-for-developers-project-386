import request from 'supertest';
import app from '../src/app.js';
import { resetStore } from '../src/store.js';

// Состояние хранилища сбрасывается перед каждым тестом (см. README)
beforeEach(resetStore);

const createEventType = (overrides = {}) =>
  request(app)
    .post('/api/event-types')
    .send({ title: 'Созвон на 30 минут', durationMinutes: 30, ...overrides });

describe('GET /api/event-types', () => {
  test('без типов возвращает 200 и пустой список', async () => {
    const response = await request(app).get('/api/event-types');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('возвращает созданные типы встреч', async () => {
    await createEventType({ title: 'Первый', durationMinutes: 60 });
    await createEventType({ title: 'Второй', durationMinutes: 90 });

    const response = await request(app).get('/api/event-types');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((item) => item.title)).toEqual([
      'Первый',
      'Второй',
    ]);
    expect(response.body.map((item) => item.durationMinutes)).toEqual([
      60,
      90,
    ]);
  });
});

describe('POST /api/event-types', () => {
  test('создание: 201, в ответе id, title, description, durationMinutes', async () => {
    const response = await request(app)
      .post('/api/event-types')
      .send({ title: 'Созвон', description: 'Короткий созвон', durationMinutes: 30 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      title: 'Созвон',
      description: 'Короткий созвон',
      durationMinutes: 30,
    });
  });

  test('description необязателен — по умолчанию пустая строка', async () => {
    const response = await createEventType({ description: undefined });

    expect(response.status).toBe(201);
    expect(response.body.description).toBe('');
  });

  test('дубликаты названий разрешены: оба ответа 201 с разными id', async () => {
    const first = await createEventType({ title: 'Одинаковый' });
    const second = await createEventType({ title: 'Одинаковый' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.id).not.toBe(second.body.id);
  });

  test('тримминг: строки с пробелами по краям хранятся обрезанными', async () => {
    const response = await createEventType({
      title: '   Созвон   ',
      description: '   описание   ',
    });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Созвон');
    expect(response.body.description).toBe('описание');
  });

  test('title длиной ровно 100 символов — 201', async () => {
    const response = await createEventType({ title: 'a'.repeat(100) });

    expect(response.status).toBe(201);
  });

  test('description длиной ровно 500 символов — 201', async () => {
    const response = await createEventType({ description: 'a'.repeat(500) });

    expect(response.status).toBe(201);
  });

  test('пустой title (после тримминга) → 400 «Название обязательно.»', async () => {
    const response = await createEventType({ title: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Название обязательно.' });
  });

  test('отсутствующий title → 400 «Название обязательно.»', async () => {
    const response = await request(app)
      .post('/api/event-types')
      .send({ durationMinutes: 30 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Название обязательно.' });
  });

  test('title длиннее 100 → 400 «Название не должно превышать 100 символов.»', async () => {
    const response = await createEventType({ title: 'a'.repeat(101) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Название не должно превышать 100 символов.',
    });
  });

  test('description длиннее 500 → 400 «Описание не должно превышать 500 символов.»', async () => {
    const response = await createEventType({ description: 'a'.repeat(501) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Описание не должно превышать 500 символов.',
    });
  });

  test.each([45, 60.5, 0, 150, '60', null])(
    'durationMinutes %p не из набора → 400 «Длительность должна быть 30, 60, 90 или 120 минут.»',
    async (durationMinutes) => {
      const response = await createEventType({ durationMinutes });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Длительность должна быть 30, 60, 90 или 120 минут.',
      });
    },
  );

  test('отсутствующий durationMinutes → 400 «Длительность должна быть 30, 60, 90 или 120 минут.»', async () => {
    const response = await request(app)
      .post('/api/event-types')
      .send({ title: 'Созвон' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Длительность должна быть 30, 60, 90 или 120 минут.',
    });
  });
});
