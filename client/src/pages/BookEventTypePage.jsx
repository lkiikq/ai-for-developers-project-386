import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createBooking, getEventTypeSlots, listEventTypes } from '../api/index.js';
import { getBookingWindow, isWeekend } from '../dates.js';
import BookingForm from '../components/BookingForm.jsx';
import DayPicker from '../components/DayPicker.jsx';
import SlotList from '../components/SlotList.jsx';

// Страница гостя: календарь на 14 дней, свободные слоты и бронирование
// (см. README, сценарии 4 и 5)
const BookEventTypePage = () => {
  const { id } = useParams();
  const days = useMemo(() => getBookingWindow(), []);

  const [eventType, setEventType] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    () => days.find((day) => !isWeekend(day)) ?? days[0],
  );
  const [slots, setSlots] = useState(null);
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listEventTypes()
      .then(({ data, error }) => {
        if (cancelled) return;
        const found = error ? null : (data ?? []).find((type) => type.id === id);
        if (found) setEventType(found);
        else setNotFound(true);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    getEventTypeSlots({ path: { id }, query: { date: selectedDate } })
      .then(({ data, error }) => {
        if (!cancelled) setSlots(error ? [] : (data ?? []));
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id, selectedDate, slotsReloadKey]);

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setFeedback(null);
    setSlots(null);
  };

  const handleBook = async ({ guestName, guestEmail }) => {
    setBusy(true);
    setFeedback(null);
    try {
      const { error, response } = await createBooking({
        body: {
          eventTypeId: id,
          date: selectedDate,
          startTime: selectedSlot.startTime,
          guestName,
          guestEmail,
        },
      });
      if (error) {
        setFeedback({
          type: 'error',
          text: response.status === 409
            ? 'Это время уже занято. Выберите другое время.'
            : 'Не удалось создать запись. Проверьте данные и попробуйте ещё раз.',
        });
      } else {
        setFeedback({
          type: 'success',
          text: `Готово! Вы записаны на ${selectedDate} в ${selectedSlot.startTime}.`,
        });
        setSelectedSlot(null);
      }
    } catch {
      setFeedback({
        type: 'error',
        text: 'Не удалось создать запись. Попробуйте ещё раз.',
      });
    } finally {
      setBusy(false);
      // Слоты перезапрашиваем в любом случае: после успешной записи
      // слот занят, после конфликта (409) его мог занять другой гость.
      setSlots(null);
      setSlotsReloadKey((key) => key + 1);
    }
  };

  if (notFound) {
    return (
      <section>
        <h1>Тип встречи не найден</h1>
        <p><Link to="/">← К списку типов встреч</Link></p>
      </section>
    );
  }

  if (!eventType) return <p>Загрузка…</p>;

  return (
    <section>
      <h1>{eventType.title}</h1>
      <p>{eventType.description}</p>
      <p className="muted">Длительность: {eventType.durationMinutes} мин</p>

      <h2>Выберите дату</h2>
      <DayPicker days={days} selectedDate={selectedDate} onSelect={handleSelectDate} />

      <h2>Свободные слоты</h2>
      {slots === null && <p>Загрузка слотов…</p>}
      {slots !== null && slots.length === 0 && (
        <p className="muted">На эту дату свободных слотов нет.</p>
      )}
      {slots !== null && slots.length > 0 && (
        <SlotList
          slots={slots}
          selectedSlot={selectedSlot}
          onSelect={(slot) => {
            setSelectedSlot(slot);
            setFeedback(null);
          }}
        />
      )}

      {selectedSlot && (
        <>
          <h2>Запись на {selectedDate}, {selectedSlot.startTime}–{selectedSlot.endTime}</h2>
          <BookingForm busy={busy} onSubmit={handleBook} />
        </>
      )}

      {feedback && <p className={`message ${feedback.type}`}>{feedback.text}</p>}
    </section>
  );
};

export default BookEventTypePage;
