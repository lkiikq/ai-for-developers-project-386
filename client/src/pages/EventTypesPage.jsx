import { useEffect, useState } from 'react';
import { listEventTypes } from '../api/index.js';
import EventTypeList from '../components/EventTypeList.jsx';
import LoadError from '../components/LoadError.jsx';

// Страница записи (/event-types): список типов встреч карточками
// (см. README, «Страницы и UX»)
const EventTypesPage = () => {
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
      <h1>Запись на звонок</h1>
      {status === 'loading' && <p>Загрузка…</p>}
      {status === 'error' && <LoadError onRetry={reload} />}
      {status === 'ready' && (eventTypes.length === 0 ? (
        <p className="muted">Пока нет доступных типов встреч. Загляните позже.</p>
      ) : (
        <EventTypeList eventTypes={eventTypes} selectable />
      ))}
    </section>
  );
};

export default EventTypesPage;
