import request from 'supertest';
import app from '../src/app.js';
import store, { resetStore } from '../src/store.js';
import {
  addDays,
  firstWeekdayInWindow,
  firstWeekendInWindow,
  today,
} from './helpers.js';

// Состояние хранилища сбрасывается перед каждым тестом (см. README)
beforeEach(resetStore);

const createEventType = (title, durationMinutes) =>
  request(app)
    .post('/api/event-types')
    .send({ title, durationMinutes });

const getSlots = (eventTypeId, date) =>
  request(app).get(`/api/event-types/${eventTypeId}/slots`).query({ date });

// Проверка полного списка ожидаемых стартов
const expectStarts = (body, expectedStarts) => {
  expect(body.map((slot) => slot.startTime)).toEqual(expectedStarts);
};

const range = (from, to) => {
  const starts = [];
  const toMinutes = (value) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const pad = (value) => String(value).padStart(2, '0');
  for (let time = toMinutes(from); time <= toMinutes(to); time += 30) {
    starts.push(`${pad(Math.floor(time / 60))}:${pad(time % 60)}`);
  }
  return starts;
};

describe('GET /api/event-types/:id/slots — сетка слотов', () => {
  test('свободный будний день, тип 30 мин: 16 стартов 10:00–17:30, конец 18:00', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);
    const date = firstWeekdayInWindow();

    const response = await getSlots(eventType.id, date);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(16);
    expectStarts(response.body, range('10:00', '17:30'));
    expect(response.body[0]).toEqual({ startTime: '10:00', endTime: '10:30' });
    expect(response.body[15]).toEqual({
      startTime: '17:30',
      endTime: '18:00',
    });
  });

  test('тип 120 мин: последний старт 16:00, конец ровно 18:00', async () => {
    const { body: eventType } = await createEventType('Долгая встреча', 120);
    const date = firstWeekdayInWindow();

    const response = await getSlots(eventType.id, date);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(13);
    expectStarts(response.body, range('10:00', '16:00'));
    expect(response.body.at(-1)).toEqual({
      startTime: '16:00',
      endTime: '18:00',
    });
  });

  test('выходной (сб/вс) → 200 и пустой список, не ошибка', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);
    const date = firstWeekendInWindow();

    const response = await getSlots(eventType.id, date);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('занятый интервал исключает пересекающиеся старты, в том числе брони других типов; back-to-back доступен', async () => {
    const date = firstWeekdayInWindow();
    const { body: shortType } = await createEventType('Короткий', 30);
    const { body: longType } = await createEventType('Длинный', 60);

    // Занят интервал бронью ДРУГОГО типа (60 мин): 10:30–11:30.
    // Строки брони закидываем в хранилище напрямую — API бронирования
    // покрывается отдельным набором тестов.
    store.bookings.push({
      id: 'seed-booking-1',
      eventTypeId: longType.id,
      date,
      startTime: '10:30',
      endTime: '11:30',
      guestName: 'Гость',
      guestEmail: 'guest@example.com',
    });

    const response = await getSlots(shortType.id, date);

    expect(response.status).toBe(200);
    const starts = response.body.map((slot) => slot.startTime);
    // Пересечение с 10:30–11:30: старты 10:30 и 11:00 исключены
    expect(starts).not.toContain('10:30');
    expect(starts).not.toContain('11:00');
    // back-to-back: 10:00–10:30 (окончание ровно в начале занятого) и
    // 11:30–12:00 (старт ровно в окончание занятого) доступны
    expect(starts).toContain('10:00');
    expect(starts).toContain('11:30');
    expect(starts).toHaveLength(14);

    // Тот же занятый интервал виден и для типа 60 мин
    const longResponse = await getSlots(longType.id, date);
    const longStarts = longResponse.body.map((slot) => slot.startTime);
    expect(longStarts).not.toContain('10:00');
    expect(longStarts).not.toContain('10:30');
    expect(longStarts).not.toContain('11:00');
    expect(longStarts).toContain('11:30');
  });
});

describe('GET /api/event-types/:id/slots — окно бронирования', () => {
  test('сегодня, вчера и завтра+14 → 400 «Дата вне окна бронирования…»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);
    const outOfWindow = [
      today(),
      addDays(today(), -1),
      addDays(today(), 15), // завтра + 14
    ];

    for (const date of outOfWindow) {
      const response = await getSlots(eventType.id, date);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Дата вне окна бронирования: запись открыта на 14 дней, начиная с завтрашнего дня.',
      });
    }
  });

  test('завтра и завтра+13 → 200', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);
    const inWindow = [addDays(today(), 1), addDays(today(), 14)];

    for (const date of inWindow) {
      const response = await getSlots(eventType.id, date);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    }
  });
});

describe('GET /api/event-types/:id/slots — ошибки', () => {
  test('битый формат date → 400 «Некорректная дата: ожидается формат YYYY-MM-DD.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    for (const date of ['not-a-date', '2026-2-5', '2027-02-30']) {
      const response = await getSlots(eventType.id, date);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Некорректная дата: ожидается формат YYYY-MM-DD.',
      });
    }
  });

  test('отсутствующий date → 400 «Параметр date обязателен.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    const response = await request(app)
      .get(`/api/event-types/${eventType.id}/slots`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Параметр date обязателен.' });
  });

  test('неизвестный id → 404 «Тип встречи не найден.»', async () => {
    const response = await getSlots(
      '00000000-0000-4000-8000-000000000000',
      firstWeekdayInWindow(),
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Тип встречи не найден.' });
  });
});
