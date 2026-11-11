import request from 'supertest';
import app from '../src/app.js';
import store, { resetStore } from '../src/store.js';
import { addDays, firstWeekdayInWindow, firstWeekendInWindow, today } from './helpers.js';

// Состояние хранилища сбрасывается перед каждым тестом (см. README)
beforeEach(resetStore);

const createEventType = (title, durationMinutes) =>
  request(app)
    .post('/api/event-types')
    .send({ title, durationMinutes });

const createBooking = (overrides = {}) =>
  request(app)
    .post('/api/bookings')
    .send({
      eventTypeId: 'type-1',
      date: '2027-01-01',
      startTime: '10:00',
      guestName: 'Иван Иванов',
      guestEmail: 'ivan@example.com',
      ...overrides,
    });

// Прямая запись в хранилище — для дат вне окна бронирования
// (вчерашние/начавшиеся), которые недоступны через API
const seedBooking = (overrides) => {
  store.bookings.push({
    id: 'seed-booking',
    eventTypeId: 'seed-type',
    date: '2027-01-01',
    startTime: '10:00',
    endTime: '10:30',
    guestName: 'Гость',
    guestEmail: 'guest@example.com',
    ...overrides,
  });
};

describe('POST /api/bookings — успех', () => {
  test('201: в ответе createdAt — момент создания брони (date-time)', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);
    const before = Date.now();

    const response = await createBooking({
      eventTypeId: eventType.id,
      date: firstWeekdayInWindow(),
      startTime: '10:00',
    });

    expect(response.status).toBe(201);
    expect(response.body.createdAt).toEqual(expect.any(String));
    const createdAt = Date.parse(response.body.createdAt);
    expect(Number.isNaN(createdAt)).toBe(false);
    expect(createdAt).toBeGreaterThanOrEqual(before);
    expect(createdAt).toBeLessThanOrEqual(Date.now());
  });

  test('201: в ответе endTime = startTime + durationMinutes типа', async () => {
    const { body: eventType } = await createEventType('Созвон', 60);
    const date = firstWeekdayInWindow();

    const response = await createBooking({
      eventTypeId: eventType.id,
      date,
      startTime: '10:00',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      eventTypeId: eventType.id,
      date,
      startTime: '10:00',
      endTime: '11:00',
      guestName: 'Иван Иванов',
      guestEmail: 'ivan@example.com',
      createdAt: expect.any(String),
    });
    expect(store.bookings).toHaveLength(1);
  });

  test('тримминг: имя и email хранятся обрезанными', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    const response = await createBooking({
      eventTypeId: eventType.id,
      date: firstWeekdayInWindow(),
      startTime: '10:00',
      guestName: '   Иван   ',
      guestEmail: '  ivan@example.com  ',
    });

    expect(response.status).toBe(201);
    expect(response.body.guestName).toBe('Иван');
    expect(response.body.guestEmail).toBe('ivan@example.com');
  });

  test('имя длиной ровно 100 символов — 201', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    const response = await createBooking({
      eventTypeId: eventType.id,
      date: firstWeekdayInWindow(),
      startTime: '10:00',
      guestName: 'a'.repeat(100),
    });

    expect(response.status).toBe(201);
  });

  test('back-to-back: старт ровно в момент окончания брони — 201', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);
    const date = firstWeekdayInWindow();

    const first = await createBooking({
      eventTypeId: eventType.id,
      date,
      startTime: '10:00',
    });
    const second = await createBooking({
      eventTypeId: eventType.id,
      date,
      startTime: '10:30',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(store.bookings).toHaveLength(2);
  });
});

describe('POST /api/bookings — 409 при пересечении', () => {
  test('то же время дважды → 409 «Это время уже занято. Выберите другое время.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);
    const date = firstWeekdayInWindow();

    const first = await createBooking({
      eventTypeId: eventType.id,
      date,
      startTime: '10:00',
    });
    const second = await createBooking({
      eventTypeId: eventType.id,
      date,
      startTime: '10:00',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body).toEqual({
      error: 'Это время уже занято. Выберите другое время.',
    });
    expect(store.bookings).toHaveLength(1);
  });

  test('частичное наложение: 60 мин в 10:00 против 30 мин в 10:30 → 409, в том числе другого типа', async () => {
    const { body: longType } = await createEventType('Длинный', 60);
    const { body: shortType } = await createEventType('Короткий', 30);
    const date = firstWeekdayInWindow();

    const first = await createBooking({
      eventTypeId: longType.id,
      date,
      startTime: '10:00',
    });
    const second = await createBooking({
      eventTypeId: shortType.id,
      date,
      startTime: '10:30',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body).toEqual({
      error: 'Это время уже занято. Выберите другое время.',
    });
    expect(store.bookings).toHaveLength(1);
  });

  test('конкурентные два POST на один слот → один 201, другой 409', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);
    const payload = {
      eventTypeId: eventType.id,
      date: firstWeekdayInWindow(),
      startTime: '10:00',
      guestName: 'Гость',
      guestEmail: 'guest@example.com',
    };

    const [first, second] = await Promise.all([
      request(app).post('/api/bookings').send(payload),
      request(app).post('/api/bookings').send(payload),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
    const conflict = [first, second].find((response) => response.status === 409);
    expect(conflict.body).toEqual({
      error: 'Это время уже занято. Выберите другое время.',
    });
    expect(store.bookings).toHaveLength(1);
  });
});

describe('POST /api/bookings — 400: расписание', () => {
  test('сегодня, вчера и завтра+14 → 400 «Дата вне окна бронирования…»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);
    const outOfWindow = [
      today(),
      addDays(today(), -1),
      addDays(today(), 15), // завтра + 14
    ];

    for (const date of outOfWindow) {
      const response = await createBooking({
        eventTypeId: eventType.id,
        date,
      });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Дата вне окна бронирования: запись открыта на 14 дней, начиная с завтрашнего дня.',
      });
    }
  });

  test('выходной день → 400 «Выбранное время недоступно для записи.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    const response = await createBooking({
      eventTypeId: eventType.id,
      date: firstWeekendInWindow(),
      startTime: '10:00',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Выбранное время недоступно для записи.',
    });
  });

  test('старт не на сетке 30 минут → 400 «Выбранное время недоступно для записи.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    const response = await createBooking({
      eventTypeId: eventType.id,
      date: firstWeekdayInWindow(),
      startTime: '10:15',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Выбранное время недоступно для записи.',
    });
  });

  test('вне рабочих часов → 400 «Выбранное время недоступно для записи.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    const response = await createBooking({
      eventTypeId: eventType.id,
      date: firstWeekdayInWindow(),
      startTime: '09:00',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Выбранное время недоступно для записи.',
    });
  });

  test('конец позже 18:00 → 400 «Выбранное время недоступно для записи.»', async () => {
    const { body: eventType } = await createEventType('Длинный', 60);

    const response = await createBooking({
      eventTypeId: eventType.id,
      date: firstWeekdayInWindow(),
      startTime: '17:30', // конец 18:30
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Выбранное время недоступно для записи.',
    });
  });

  test('битый формат date → 400 «Некорректная дата: ожидается формат YYYY-MM-DD.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    for (const date of ['not-a-date', '2026-2-5', '2027-02-30']) {
      const response = await createBooking({
        eventTypeId: eventType.id,
        date,
      });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Некорректная дата: ожидается формат YYYY-MM-DD.',
      });
    }
  });

  test('битый формат startTime → 400 «Некорректное время начала: ожидается формат HH:mm.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    for (const startTime of ['9:00', '25:00', '10-00', 'abcdef']) {
      const response = await createBooking({
        eventTypeId: eventType.id,
        date: firstWeekdayInWindow(),
        startTime,
      });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Некорректное время начала: ожидается формат HH:mm.',
      });
    }
  });
});

describe('POST /api/bookings — 400: поля', () => {
  test('пустое имя после тримминга → 400 «Имя обязательно.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    const response = await createBooking({
      eventTypeId: eventType.id,
      date: firstWeekdayInWindow(),
      guestName: '   ',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Имя обязательно.' });
  });

  test('имя длиннее 100 → 400 «Имя не должно превышать 100 символов.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    const response = await createBooking({
      eventTypeId: eventType.id,
      date: firstWeekdayInWindow(),
      guestName: 'a'.repeat(101),
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Имя не должно превышать 100 символов.',
    });
  });

  test('email без шаблона → 400 «Некорректный email.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    for (const guestEmail of ['nope', 'a@b', 'a b@c.ru', '']) {
      const response = await createBooking({
        eventTypeId: eventType.id,
        date: firstWeekdayInWindow(),
        guestEmail,
      });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Некорректный email.' });
    }
  });

  test('email длиннее 254 → 400 «Некорректный email.»', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);

    const response = await createBooking({
      eventTypeId: eventType.id,
      date: firstWeekdayInWindow(),
      guestEmail: `${'a'.repeat(245)}@${'b'.repeat(8)}.io`,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Некорректный email.' });
  });
});

describe('POST /api/bookings — 404', () => {
  test('неизвестный eventTypeId → 404 «Тип встречи не найден.»', async () => {
    const response = await createBooking({
      eventTypeId: '00000000-0000-4000-8000-000000000000',
      date: firstWeekdayInWindow(),
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Тип встречи не найден.' });
  });
});

describe('GET /api/bookings — предстоящие', () => {
  test('без броней → 200 []', async () => {
    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('GET возвращает createdAt, сохранённый при создании брони', async () => {
    const { body: eventType } = await createEventType('Созвон', 30);
    const created = await createBooking({
      eventTypeId: eventType.id,
      date: firstWeekdayInWindow(),
      startTime: '10:00',
    });

    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].createdAt).toEqual(expect.any(String));
    expect(response.body[0].createdAt).toBe(created.body.createdAt);
  });

  test('вчерашние исключены, сегодняшние (уже начавшиеся) и будущие включены', async () => {
    seedBooking({ id: 'yesterday', date: addDays(today(), -1) });
    seedBooking({ id: 'today-started', date: today(), startTime: '10:00', endTime: '10:30' });
    seedBooking({ id: 'tomorrow', date: addDays(today(), 1) });

    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.map((booking) => booking.id)).toEqual([
      'today-started',
      'tomorrow',
    ]);
  });

  test('сортировка по дате и времени, ближайшие выше', async () => {
    seedBooking({ id: 'later', date: addDays(today(), 5), startTime: '10:00' });
    seedBooking({ id: 'tomorrow-evening', date: addDays(today(), 1), startTime: '14:00' });
    seedBooking({ id: 'tomorrow-morning', date: addDays(today(), 1), startTime: '10:00' });
    seedBooking({ id: 'today-evening', date: today(), startTime: '17:00' });

    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.map((booking) => booking.id)).toEqual([
      'today-evening',
      'tomorrow-morning',
      'tomorrow-evening',
      'later',
    ]);
  });
});
