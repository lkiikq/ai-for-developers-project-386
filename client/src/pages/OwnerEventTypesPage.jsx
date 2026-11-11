import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listEventTypes } from '../api/index.js';
import EventTypeList from '../components/EventTypeList.jsx';
import LoadError from '../components/LoadError.jsx';

// Типы встреч владельца (/owner/event-types): список, переходы по зоне
// владельца, empty и error (см. README, «Страницы и UX»)
const OwnerEventTypesPage = () => {
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState('loading');
  const [eventTypes, setEventTypes] = useState([]);

  // Сброс статуса — в обработчике повтора, не в теле эффекта (react-hooks)
  const reload = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  useEffect(() => {
    let cancelled = false;
    listEventTypes()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setStatus('error');
          return;
        }
        setEventTypes(data ?? []);
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
      <h1>Типы встреч</h1>
      <nav className="owner-nav">
        <Link to="/owner/event-types/new">Новый тип встречи</Link>
      </nav>
      {status === 'loading' && <p>Загрузка…</p>}
      {status === 'error' && <LoadError onRetry={reload} />}
      {status === 'ready' && (eventTypes.length === 0 ? (
        <>
          <p className="muted">Типов встреч пока нет.</p>
          <Link className="cta" to="/owner/event-types/new">Создать первый тип</Link>
        </>
      ) : (
        <EventTypeList eventTypes={eventTypes} />
      ))}
    </section>
  );
};

export default OwnerEventTypesPage;
