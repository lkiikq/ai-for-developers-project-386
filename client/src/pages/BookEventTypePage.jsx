import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createBooking, getEventTypeSlots, listEventTypes } from '../api/index.js';
import { formatFullDate, getBookingWindow, isWeekend } from '../dates.js';
import BookingForm from '../components/BookingForm.jsx';
import CalendarGrid from '../components/CalendarGrid.jsx';
import DaySlots from '../components/DaySlots.jsx';
import LoadError from '../components/LoadError.jsx';

const WORK_START_MIN = 10 * 60; // 10:00
const WORK_END_MIN = 18 * 60; // 18:00
const STEP_MIN = 30;
const CONFLICT_NOTICE = 'Это время уже занято. Выберите другое время.';
const BOOKING_FALLBACK_ERROR = 'Не удалось создать бронь. Попробуйте ещё раз.';

const formatMinutes = (total) => (
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
);

// Полная сетка дня: старты с шагом 30 минут, конец встречи не позже 18:00
const buildDayGrid = (durationMinutes) => {
  const grid = [];
  for (let start = WORK_START_MIN; start + durationMinutes <= WORK_END_MIN; start += STEP_MIN) {
    grid.push({
      startTime: formatMinutes(start),
      endTime: formatMinutes(start + durationMinutes),
    });
  }
  return grid;
};

// Страница слотов (/event-types/:id): одна страница с внутренними шагами —
// выбор слота (три колонки), подтверждение, успех (см. README,
// «Страницы и UX»)
const BookEventTypePage = () => {
  const { id } = useParams();
  const days = useMemo(() => getBookingWindow(), []);
  const [monthCursor, setMonthCursor] = useState(() => {
    const firstAvailable = days.find((date) => !isWeekend(date)) ?? days[0];
    return new Date(`${firstAvailable}T00:00:00Z`);
  });

  const [status, setStatus] = useState('loading'); // loading | error | notFound | ready
  const [eventType, setEventType] = useState(null);
  const [slotsByDate, setSlotsByDate] = useState({});
  const [slotsError, setSlotsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [step, setStep] = useState('select'); // select | confirm | success
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [conflictNotice, setConflictNotice] = useState(null);

  // Тип встречи: 404 — данные есть, но типа с таким id нет
  useEffect(() => {
    let cancelled = false;
    listEventTypes()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setStatus('error');
          return;
        }
        const found = (data ?? []).find((type) => type.id === id);
        if (found) {
          setEventType(found);
          setStatus('ready');
        } else {
          setStatus('notFound');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  // Слоты всех дат окна — для счётчиков «N св.» в календаре; при сбое
  // (сеть/5xx) — общее error-состояние с кнопкой «Повторить»
  useEffect(() => {
    if (status !== 'ready') return undefined;
    let cancelled = false;
    Promise.all(days.map((date) => Promise.resolve()
      .then(() => getEventTypeSlots({ path: { id }, query: { date } }))
      .then(({ data, error }) => [date, error ? [] : (data ?? [])])
      .catch(() => [date, null]))).then((entries) => {
      if (cancelled) return;
      if (entries.some(([, slots]) => slots === null)) {
        setSlotsError(true);
        return;
      }
      setSlotsByDate(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [id, status, reloadKey, days]);

  const dayGrid = useMemo(
    () => (eventType ? buildDayGrid(eventType.durationMinutes) : []),
    [eventType],
  );
  const freeStarts = useMemo(() => new Set(
    ((selectedDate && slotsByDate[selectedDate]) || []).map((slot) => slot.startTime),
  ), [slotsByDate, selectedDate]);
  const counts = useMemo(() => Object.fromEntries(
    Object.entries(slotsByDate).map(([date, slots]) => [date, slots.length]),
  ), [slotsByDate]);

  const reload = () => {
    setStatus('loading');
    setSlotsError(false);
    setReloadKey((key) => key + 1);
  };

  // Выбор даты: повторный запрос слотов этой даты (матрица: «выбор даты →
  // запрос слотов»)
  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setConflictNotice(null);
    setStep('select');
    Promise.resolve()
      .then(() => getEventTypeSlots({ path: { id }, query: { date } }))
      .then(({ data, error }) => {
        if (!error) setSlotsByDate((current) => ({ ...current, [date]: data ?? [] }));
      })
      .catch(() => {});
  };

  const handleBook = async ({ guestName, guestEmail }) => {
    setBusy(true);
    setFormError(null);
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
      if (!error) {
        setStep('success');
        return;
      }
      if (response?.status === 409) {
        // Флоу 409: возврат к слотам, слот сброшен, слоты перезапрошены
        setStep('select');
        setSelectedSlot(null);
        setConflictNotice(CONFLICT_NOTICE);
        setReloadKey((key) => key + 1);
        return;
      }
      setFormError(error.error ?? BOOKING_FALLBACK_ERROR);
    } catch {
      setFormError(BOOKING_FALLBACK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const handleBookAgain = () => {
    setStep('select');
    setSelectedSlot(null);
    setFormError(null);
    setConflictNotice(null);
    setReloadKey((key) => key + 1);
  };

  const infoColumn = eventType && (
    <div className="col">
      <div className="info-block">
        <span className="info-label">Тип встречи</span>
        <span>{eventType.title}</span>
      </div>
      <div className="info-block">
        <span className="info-label">Выбранная дата</span>
        <span>{selectedDate ? formatFullDate(selectedDate) : 'Дата не выбрана'}</span>
      </div>
      <div className="info-block">
        <span className="info-label">Выбранное время</span>
        <span>
          {selectedSlot
            ? `${selectedSlot.startTime} - ${selectedSlot.endTime}`
            : 'Время не выбрано'}
        </span>
      </div>
      <div className="info-block">
        <span className="info-label">Свободно</span>
        <span>{freeStarts.size}</span>
      </div>
      <div className="info-block">
        <span className="info-label">Длительности в дне</span>
        <span>
          {freeStarts.size > 0
            ? `${eventType.durationMinutes} мин`
            : 'Нет слотов на этот день'}
        </span>
      </div>
    </div>
  );

  const calendarColumn = (
    <div className="col">
      <CalendarGrid
        month={monthCursor}
        days={days}
        counts={counts}
        selectedDate={selectedDate}
        onSelect={handleSelectDate}
        onPrevMonth={() => setMonthCursor((month) => new Date(Date.UTC(
          month.getUTCFullYear(), month.getUTCMonth() - 1, 1,
        )))}
        onNextMonth={() => setMonthCursor((month) => new Date(Date.UTC(
          month.getUTCFullYear(), month.getUTCMonth() + 1, 1,
        )))}
      />
    </div>
  );

  if (status === 'loading') {
    return (
      <section>
        <h1>Запись на звонок</h1>
        <p>Загрузка…</p>
      </section>
    );
  }

  if (status === 'notFound') {
    return (
      <section>
        <h1>Запись на звонок</h1>
        <p>Тип встречи не найден.</p>
        <Link to="/event-types">К списку типов</Link>
      </section>
    );
  }

  if (status === 'error' || slotsError) {
    return (
      <section>
        <h1>Запись на звонок</h1>
        <LoadError onRetry={reload} />
      </section>
    );
  }

  return (
    <section>
      <h1>Запись на звонок</h1>
      <div className="booking-columns">
        {infoColumn}
        {calendarColumn}
        <div className="col">
          {step === 'select' && (
            <>
              {conflictNotice && <p className="message error">{conflictNotice}</p>}
              {selectedDate ? (
                <DaySlots
                  grid={dayGrid}
                  freeStarts={freeStarts}
                  selectedSlot={selectedSlot}
                  onSelect={setSelectedSlot}
                />
              ) : (
                <p className="muted">Выберите дату в календаре.</p>
              )}
            </>
          )}
          {step === 'confirm' && (
            <div className="card">
              <h2>Подтверждение записи</h2>
              <button
                type="button"
                className="button secondary"
                onClick={() => setStep('select')}
              >
                Изменить
              </button>
              <BookingForm busy={busy} error={formError} onSubmit={handleBook} />
            </div>
          )}
          {step === 'success' && (
            <div className="card">
              <p className="success-title">Бронь подтверждена. До встречи!</p>
              <button type="button" className="button" onClick={handleBookAgain}>
                Забронировать еще
              </button>
            </div>
          )}
        </div>
      </div>
      {step === 'select' && (
        <div className="actions">
          <Link className="button secondary" to="/event-types">Назад</Link>
          <button
            type="button"
            className="button"
            disabled={!selectedSlot}
            onClick={() => setStep('confirm')}
          >
            Продолжить
          </button>
        </div>
      )}
    </section>
  );
};

export default BookEventTypePage;
