// Вспомогательные функции для API-тестов. Даты считаются в часовом поясе
// API (Asia/Almaty) — так же, как их считает сервер, чтобы тесты не зависели
// от локального часового пояса машины.

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Almaty',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Сегодняшняя дата (Asia/Almaty) в формате YYYY-MM-DD
export const today = () => dateFormatter.format(new Date());

// dateStr +/- N календарных дней
export const addDays = (dateStr, days) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

// Завтрашняя дата — начало окна бронирования
export const tomorrow = () => addDays(today(), 1);

const dayOfWeek = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

// Первый будний день (пн–пт) внутри окна бронирования
export const firstWeekdayInWindow = () => {
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = addDays(today(), offset);
    const day = dayOfWeek(date);
    if (day >= 1 && day <= 5) return date;
  }
  throw new Error('в окне бронирования нет буднего дня');
};

// Первый выходной (сб/вс) внутри окна бронирования
export const firstWeekendInWindow = () => {
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = addDays(today(), offset);
    const day = dayOfWeek(date);
    if (day === 0 || day === 6) return date;
  }
  throw new Error('в окне бронирования нет выходного дня');
};
