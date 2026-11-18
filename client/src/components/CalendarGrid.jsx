import { formatMonthYear, dayOfMonth, mondayIndex, isWeekend } from '../dates.js';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Сетка календаря: неделя с понедельника, заголовок месяца, кнопки «←» «→».
// Доступные даты окна бронирования — со счётчиком свободных слотов «N св.»,
// выходные и недоступные приглушены, выбранная — с оранжевой рамкой
// (см. README, «Страницы и UX»)
const CalendarGrid = ({
  month, days, counts, selectedDate, onSelect, onPrevMonth, onNextMonth,
}) => {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const available = new Set(days);

  const cells = [
    ...Array.from({ length: mondayIndex(firstOfMonth) }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => (
      new Date(Date.UTC(year, monthIndex, i + 1)).toISOString().slice(0, 10)
    )),
  ];

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button type="button" aria-label="Предыдущий месяц" onClick={onPrevMonth}>←</button>
        <span className="calendar-title">{formatMonthYear(month)}</span>
        <button type="button" aria-label="Следующий месяц" onClick={onNextMonth}>→</button>
      </div>
      <div className="calendar-grid calendar-weekdays">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="cal-weekday">{weekday}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} className="cal-day empty" />;
          const isEnabled = available.has(date) && !isWeekend(date);
          const count = counts[date];
          return (
            <button
              key={date}
              type="button"
              aria-label={date}
              className={[
                'cal-day',
                isEnabled ? 'available' : 'muted',
                date === selectedDate ? 'selected' : '',
              ].filter(Boolean).join(' ')}
              disabled={!isEnabled}
              onClick={() => onSelect(date)}
            >
              <span className="cal-day-number">{dayOfMonth(date)}</span>
              {isEnabled && count !== undefined && (
                <span className="cal-day-count">{count} св.</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
