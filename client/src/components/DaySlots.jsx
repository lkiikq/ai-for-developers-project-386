// Полная сетка дня: рабочие часы с шагом 30 минут, последний старт — конец
// встречи не позже 18:00. Слоты, отсутствующие в ответе API, показываются
// как «Занято» (приглушённая строка); свободные — кликабельные кнопки
// (см. README, «Сетка слотов дня»)
const DaySlots = ({ grid, freeStarts, selectedSlot, onSelect }) => (
  <ul className="slot-grid">
    {grid.map((slot) => {
      const free = freeStarts.has(slot.startTime);
      const selected = free && selectedSlot?.startTime === slot.startTime;
      return (
        <li key={slot.startTime} className={`slot-row${free ? '' : ' busy'}${selected ? ' selected' : ''}`}>
          {free ? (
            <button type="button" className="slot-time" onClick={() => onSelect(slot)}>
              {slot.startTime} - {slot.endTime}
            </button>
          ) : (
            <span className="slot-time">{slot.startTime} - {slot.endTime}</span>
          )}
          <span className="slot-status">{free ? 'Свободно' : 'Занято'}</span>
        </li>
      );
    })}
  </ul>
);

export default DaySlots;
