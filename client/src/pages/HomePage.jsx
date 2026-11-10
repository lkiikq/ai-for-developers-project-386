import { useEffect, useState } from 'react';
import { listEventTypes } from '../api/index.js';
import EventTypeList from '../components/EventTypeList.jsx';

// Главная страница гостя: выбор типа встречи (см. README, сценарий 3)
const HomePage = () => {
  const [state, setState] = useState({ status: 'loading', eventTypes: [] });

  useEffect(() => {
    let cancelled = false;
    listEventTypes()
      .then(({ data, error }) => {
        if (cancelled) return;
        setState(error
          ? { status: 'error', eventTypes: [] }
          : { status: 'ready', eventTypes: data ?? [] });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', eventTypes: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') return <p>Загрузка…</p>;
  if (state.status === 'error') {
    return (
      <p className="message error">
        Не удалось загрузить типы встреч. Попробуйте обновить страницу.
      </p>
    );
  }

  return (
    <section>
      <h1>Выберите тип встречи</h1>
      {state.eventTypes.length === 0 ? (
        <p className="muted">Пока нет ни одного типа встречи.</p>
      ) : (
        <EventTypeList eventTypes={state.eventTypes} />
      )}
    </section>
  );
};

export default HomePage;
