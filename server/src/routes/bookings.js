import { Router } from 'express';
import crypto from 'node:crypto';
import store from '../store.js';
import {
  dateValidationError,
  isValidTimeStr,
  isValidScheduleSlot,
  overlaps,
  toMinutes,
  fromMinutes,
  todayStr,
} from '../schedule.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Роуты бронирований:
// GET  /api/bookings — предстоящие бронирования всех типов (владелец)
// POST /api/bookings — создать бронирование (гость)
const router = Router();

// GET /api/bookings — предстоящие по дате: все брони с сегодняшней даты
// включительно (Asia/Almaty), сортировка по дате и времени, ближайшие выше.
router.get('/', (req, res) => {
  const today = todayStr();
  const upcoming = store.bookings
    .filter((booking) => booking.date >= today)
    .sort((a, b) => {
      const keyA = `${a.date} ${a.startTime}`;
      const keyB = `${b.date} ${b.startTime}`;
      if (keyA < keyB) return -1;
      if (keyA > keyB) return 1;
      return 0;
    });
  res.json(upcoming);
});

// POST /api/bookings — создать бронирование. Валидация, проверка
// пересечения и запись выполняются синхронно, без await между проверкой
// и созданием — атомарный check-and-set (Node.js однопоточен).
router.post('/', (req, res) => {
  const body = req.body ?? {};

  const date = body.date;
  const dateError = dateValidationError(date);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  const startTime = body.startTime;
  if (!isValidTimeStr(startTime)) {
    return res
      .status(400)
      .json({ error: 'Некорректное время начала: ожидается формат HH:mm.' });
  }

  const guestName =
    typeof body.guestName === 'string' ? body.guestName.trim() : '';
  if (!guestName) {
    return res.status(400).json({ error: 'Имя обязательно.' });
  }
  if (guestName.length > 100) {
    return res
      .status(400)
      .json({ error: 'Имя не должно превышать 100 символов.' });
  }

  const guestEmail =
    typeof body.guestEmail === 'string' ? body.guestEmail.trim() : '';
  if (guestEmail.length > 254 || !EMAIL_PATTERN.test(guestEmail)) {
    return res.status(400).json({ error: 'Некорректный email.' });
  }

  const eventTypeId = body.eventTypeId;
  const eventType = store.eventTypes.find((item) => item.id === eventTypeId);
  if (!eventType) {
    return res.status(404).json({ error: 'Тип встречи не найден.' });
  }

  if (!isValidScheduleSlot(date, startTime, eventType.durationMinutes)) {
    return res
      .status(400)
      .json({ error: 'Выбранное время недоступно для записи.' });
  }

  // Атомарная проверка пересечения и создание брони: один синхронный
  // блок без await — конкурентные запросы сериализуются в однопоточном
  // Node.js, поэтому пересечение невозможно.
  const start = toMinutes(startTime);
  const end = start + eventType.durationMinutes;
  const conflict = store.bookings.some(
    (booking) =>
      booking.date === date &&
      overlaps(start, end, toMinutes(booking.startTime), toMinutes(booking.endTime)),
  );
  if (conflict) {
    return res
      .status(409)
      .json({ error: 'Это время уже занято. Выберите другое время.' });
  }

  const booking = {
    id: crypto.randomUUID(),
    eventTypeId,
    date,
    startTime,
    endTime: fromMinutes(end),
    guestName,
    guestEmail,
    // Момент создания брони — ISO-строка date-time (см. README, модели данных)
    createdAt: new Date().toISOString(),
  };
  store.bookings.push(booking);
  return res.status(201).json(booking);
});

export default router;
