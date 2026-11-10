import { Router } from 'express';
import crypto from 'node:crypto';
import store from '../store.js';
import {
  VALID_DURATIONS,
  computeFreeSlots,
  isWithinWindow,
  isValidDateStr,
} from '../schedule.js';

// Роуты типов встреч:
// GET  /api/event-types                — список типов встреч
// POST /api/event-types                — создать тип встречи (владелец)
// GET  /api/event-types/:id/slots?date=… — свободные слоты типа на дату
const router = Router();

// GET /api/event-types — список типов встреч
router.get('/', (req, res) => {
  res.json(store.eventTypes);
});

// POST /api/event-types — создать тип встречи. Валидация и запись
// выполняются синхронно, без await.
router.post('/', (req, res) => {
  const body = req.body ?? {};

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return res.status(400).json({ error: 'Название обязательно.' });
  }
  if (title.length > 100) {
    return res
      .status(400)
      .json({ error: 'Название не должно превышать 100 символов.' });
  }

  const description =
    typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length > 500) {
    return res
      .status(400)
      .json({ error: 'Описание не должно превышать 500 символов.' });
  }

  const { durationMinutes } = body;
  if (
    typeof durationMinutes !== 'number' ||
    !VALID_DURATIONS.includes(durationMinutes)
  ) {
    return res
      .status(400)
      .json({ error: 'Длительность должна быть 30, 60, 90 или 120 минут.' });
  }

  const eventType = {
    id: crypto.randomUUID(),
    title,
    description,
    durationMinutes,
  };
  store.eventTypes.push(eventType);
  return res.status(201).json(eventType);
});

// GET /api/event-types/:id/slots?date=YYYY-MM-DD — свободные слоты типа
// на дату. Выходной день → пустой список, не ошибка.
router.get('/:id/slots', (req, res) => {
  const { date } = req.query;
  if (date === undefined) {
    return res.status(400).json({ error: 'Параметр date обязателен.' });
  }
  if (!isValidDateStr(date)) {
    return res
      .status(400)
      .json({ error: 'Некорректная дата: ожидается формат YYYY-MM-DD.' });
  }
  if (!isWithinWindow(date)) {
    return res.status(400).json({
      error: 'Дата вне окна бронирования: запись открыта на 14 дней, начиная с завтрашнего дня.',
    });
  }

  const eventType = store.eventTypes.find((item) => item.id === req.params.id);
  if (!eventType) {
    return res.status(404).json({ error: 'Тип встречи не найден.' });
  }

  const slots = computeFreeSlots(
    eventType.durationMinutes,
    date,
    store.bookings,
  );
  return res.json(slots);
});

export default router;
