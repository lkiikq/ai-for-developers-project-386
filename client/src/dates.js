// Работа с датами окна бронирования. Доменные правила зафиксированы в README:
// часовой пояс Asia/Almaty, окно бронирования — 14 календарных дней,
// начиная с завтрашнего, выходные (сб, вс) недоступны для записи.
// Фронтенд использует их только для отображения календаря — доступность
// слотов всегда считает бэкенд.
const TIME_ZONE = 'Asia/Almaty';
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 14;

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const labelFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

// Текущая дата в Asia/Almaty в формате YYYY-MM-DD
const todayInAlmaty = () => dayFormatter.format(new Date());

// Окно бронирования: завтра … завтра+13, строки YYYY-MM-DD
export const getBookingWindow = () => {
  const startUtc = Date.parse(`${todayInAlmaty()}T00:00:00Z`);
  return Array.from({ length: WINDOW_DAYS }, (_, i) => (
    new Date(startUtc + (i + 1) * DAY_MS).toISOString().slice(0, 10)
  ));
};

// Подпись дня для календаря, например «ср, 12 нояб.»
export const formatDayLabel = (date) => (
  labelFormatter.format(new Date(`${date}T00:00:00Z`))
);

// Выходной ли это день (сб/вс) — по доменным правилам для записи недоступен
export const isWeekend = (date) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};
