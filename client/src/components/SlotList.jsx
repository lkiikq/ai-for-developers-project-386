const SlotList = ({ slots, selectedSlot, onSelect }) => (
  <div className="slot-list">
    {slots.map((slot) => (
      <button
        key={slot.startTime}
        type="button"
        className={`slot${selectedSlot?.startTime === slot.startTime ? ' selected' : ''}`}
        onClick={() => onSelect(slot)}
      >
        {slot.startTime}
      </button>
    ))}
  </div>
);

export default SlotList;
