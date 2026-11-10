// Расчёт дат, окна бронирования и свободных слотов (доменные правила README):
// - часовой пояс API — Asia/Almaty, все даты/время в API в нём;
// - рабочие часы пн–пт 10:00–18:00, шаг стартов 30 минут;
// - окно бронирования — 14 дней с завтрашнего (завтра … завтра+13);
// - последний старт — конец встречи не позже 18:00;
// - интервалы полуоткрытые [start, end), back-to-back разрешён.
const TIME_ZONE = 'Asia/Almaty';
const WORK_START = 10 * 60; // 10:00 в минутах
const WORK_END = 18 * 60; // 18:00 в минутах
const START_STEP = 30;
const WINDOW_DAYS = 14;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Допустимые длительности типов встреч (README: 30/60/90/120 минут)
export const VALID_DURATIONS = [30, 60, 90, 120];

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Сегодняшняя дата (Asia/Almaty) в формате YYYY-MM-DD
export const todayStr = () => dateFormatter.format(new Date());

// Строгое соответствие формату YYYY-MM-DD и существующая календарная дата
// (2027-02-30 и подобные — некорректная дата)
export const isValidDateStr = (value) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const isValidTimeStr = (value) =>
  typeof value === 'string' && TIME_PATTERN.test(value);

// День недели (0 — воскресенье … 6 — суббота) календарной даты
const dayOfWeek = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

export const isWeekend = (dateStr) => {
  const day = dayOfWeek(dateStr);
  return day === 0 || day === 6;
};

// dateStr + N календарных дней (календарная арифметика, не зависит
// от часового пояса машины)
export const addDays = (dateStr, days) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

// Окно бронирования: завтра … завтра+13 включительно
export const isWithinWindow = (dateStr) => {
  const tomorrow = addDays(todayStr(), 1);
  const lastDay = addDays(tomorrow, WINDOW_DAYS - 1);
  return dateStr >= tomorrow && dateStr <= lastDay;
};

export const toMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const pad = (value) => String(value).padStart(2, '0');

export const fromMinutes = (total) =>
  `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;

// Все старты сетки дня для длительности: от 10:00 с шагом 30 минут,
// последний старт — конец не позже 18:00
export const generateStarts = (durationMinutes) => {
  const starts = [];
  for (
    let start = WORK_START;
    start + durationMinutes <= WORK_END;
    start += START_STEP
  ) {
    starts.push(fromMinutes(start));
  }
  return starts;
};

// Слот валиден по расписанию: будний день, старт на сетке 30 минут
// в пределах 10:00–18:00, конец не позже 18:00
export const isValidScheduleSlot = (dateStr, startTime, durationMinutes) => {
  if (isWeekend(dateStr)) return false;
  const start = toMinutes(startTime);
  if (start < WORK_START || start + durationMinutes > WORK_END) return false;
  return (start - WORK_START) % START_STEP === 0;
};

// Полуоткрытые интервалы [start, end) пересекаются
export const overlaps = (startA, endA, startB, endB) =>
  startA < endB && startB < endA;

// Свободные слоты типа на дату: сетка дня минус пересечения
// с любыми бронированиями (в том числе других типов)
export const computeFreeSlots = (durationMinutes, dateStr, bookings) => {
  if (isWeekend(dateStr)) return [];

  return generateStarts(durationMinutes)
    .map((startTime) => {
      const start = toMinutes(startTime);
      return { startTime, endTime: start + durationMinutes };
    })
    .filter(
      ({ startTime, endTime }) =>
        !bookings.some(
          (booking) =>
            booking.date === dateStr &&
            overlaps(
              toMinutes(startTime),
              endTime,
              toMinutes(booking.startTime),
              toMinutes(booking.endTime),
            ),
        ),
    )
    .map(({ startTime, endTime }) => ({
      startTime,
      endTime: fromMinutes(endTime),
    }));
};
