import { formatDayLabel, isWeekend } from '../dates.js';

const DayPicker = ({ days, selectedDate, onSelect }) => (
  <div className="day-picker">
    {days.map((day) => {
      const weekend = isWeekend(day);
      return (
        <button
          key={day}
          type="button"
          className={`day${day === selectedDate ? ' selected' : ''}`}
          disabled={weekend}
          title={weekend ? 'Выходной день' : undefined}
          onClick={() => onSelect(day)}
        >
          {formatDayLabel(day)}
        </button>
      );
    })}
  </div>
);

export default DayPicker;
