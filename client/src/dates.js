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

// «суббота, 28 марта» — выбранная дата в колонке «Информация»
const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

// «март 2026 г.» — заголовок месяца в календаре
const monthFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
});

// «20.03.2026» — дата для строки «Создано: …»
const createdDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

// «09:15» — время для строки «Создано: …»
const createdTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
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

// «суббота, 28 марта» — выбранная дата (строчными, с днём недели)
export const formatFullDate = (date) => (
  fullDateFormatter.format(new Date(`${date}T00:00:00Z`))
);

// «март 2026 г.» — заголовок месяца календаря
export const formatMonthYear = (month) => monthFormatter.format(month);

// «20.03.2026, 09:15» — строка «Создано: …» (момент из API в UTC)
export const formatCreatedAt = (iso) => (
  `${createdDateFormatter.format(new Date(iso))}, ${createdTimeFormatter.format(new Date(iso))}`
);

// Номер дня месяца для кнопки календаря
export const dayOfMonth = (date) => (
  new Date(`${date}T00:00:00Z`).getUTCDate()
);

// Индекс дня недели с понедельника (0) — для сетки Пн–Вс
export const mondayIndex = (date) => (
  (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
);
