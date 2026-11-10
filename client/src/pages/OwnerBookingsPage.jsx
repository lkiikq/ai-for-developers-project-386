import { useEffect, useState } from 'react';
import { listBookings, listEventTypes } from '../api/index.js';

// Страница владельца: список предстоящих встреч (см. README, сценарий 2)
const OwnerBookingsPage = () => {
  const [state, setState] = useState({ status: 'loading', bookings: [], typesById: {} });

  useEffect(() => {
    let cancelled = false;
    Promise.all([listBookings(), listEventTypes()])
      .then(([bookingsRes, typesRes]) => {
        if (cancelled) return;
        if (bookingsRes.error || typesRes.error) {
          setState({ status: 'error', bookings: [], typesById: {} });
          return;
        }
        const typesById = Object.fromEntries(
          (typesRes.data ?? []).map((type) => [type.id, type]),
        );
        setState({ status: 'ready', bookings: bookingsRes.data ?? [], typesById });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', bookings: [], typesById: {} });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') return <p>Загрузка…</p>;
  if (state.status === 'error') {
    return (
      <p className="message error">
        Не удалось загрузить список встреч. Попробуйте обновить страницу.
      </p>
    );
  }

  return (
    <section>
      <h1>Предстоящие встречи</h1>
      {state.bookings.length === 0 ? (
        <p className="muted">Предстоящих встреч пока нет.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Время</th>
              <th>Тип встречи</th>
              <th>Гость</th>
            </tr>
          </thead>
          <tbody>
            {state.bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.date}</td>
                <td>{booking.startTime}–{booking.endTime}</td>
                <td>{state.typesById[booking.eventTypeId]?.title ?? '—'}</td>
                <td>{booking.guestName} ({booking.guestEmail})</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

export default OwnerBookingsPage;
