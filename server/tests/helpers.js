// Вспомогательные функции для API-тестов. Даты считаются в часовом поясе
// API (Asia/Almaty) — так же, как их считает сервер (общие хелперы из
// src/schedule.js), чтобы тесты не зависели от локального часового пояса
// машины.

import { addDays, isWeekend, todayStr } from '../src/schedule.js';

// Сегодняшняя дата (Asia/Almaty) в формате YYYY-MM-DD
export const today = todayStr;

// dateStr +/- N календарных дней
export { addDays };

// Завтрашняя дата — начало окна бронирования
export const tomorrow = () => addDays(today(), 1);

// Первый будний день (пн–пт) внутри окна бронирования
export const firstWeekdayInWindow = () => {
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = addDays(today(), offset);
    if (!isWeekend(date)) return date;
  }
  throw new Error('в окне бронирования нет буднего дня');
};

// Первый выходной (сб/вс) внутри окна бронирования
export const firstWeekendInWindow = () => {
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = addDays(today(), offset);
    if (isWeekend(date)) return date;
  }
  throw new Error('в окне бронирования нет выходного дня');
};
