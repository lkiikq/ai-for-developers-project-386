import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBookings } from '../api/index.js';
import LoadError from '../components/LoadError.jsx';
import { formatCreatedAt } from '../dates.js';

// Предстоящие события (/owner/bookings): карточки бронирований, сортировка
// по дате и времени встречи — ближайшие выше (см. README, «Страницы и UX»)
const OwnerBookingsPage = () => {
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState('loading');
  const [bookings, setBookings] = useState([]);

  // Сброс статуса — в обработчике повтора, не в теле эффекта (react-hooks)
  const reload = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  useEffect(() => {
    let cancelled = false;
    listBookings()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setStatus('error');
          return;
        }
        const sorted = [...(data ?? [])].sort((a, b) => (
          `${a.date}-${a.startTime}`.localeCompare(`${b.date}-${b.startTime}`)
        ));
        setBookings(sorted);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <section>
      <h1>Предстоящие события</h1>
      <nav className="owner-nav">
        <Link to="/owner/event-types">Типы встреч</Link>
      </nav>
      {status === 'loading' && <p>Загрузка…</p>}
      {status === 'error' && <LoadError onRetry={reload} />}
      {status === 'ready' && (bookings.length === 0 ? (
        <p className="muted">Предстоящих событий нет.</p>
      ) : (
        <ul className="card-list">
          {bookings.map((booking) => (
            <li key={booking.id} className="card booking-card">
              <p className="booking-guest"><strong>{booking.guestName}</strong></p>
              <p className="booking-email">{booking.guestEmail}</p>
              <p className="muted">Слот: {booking.date}-{booking.startTime}</p>
              {booking.createdAt && (
                <p className="muted">Создано: {formatCreatedAt(booking.createdAt)}</p>
              )}
            </li>
          ))}
        </ul>
      ))}
    </section>
  );
};

export default OwnerBookingsPage;
