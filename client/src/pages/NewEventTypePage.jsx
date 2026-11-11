import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEventType } from '../api/index.js';

const DURATIONS = [30, 60, 90, 120];
const FALLBACK_ERROR = 'Не удалось создать тип. Попробуйте ещё раз.';

// Новый тип встречи (/owner/event-types/new): форма с HTML5-валидацией,
// текст ошибки сервера у формы, после успеха — редирект на список
// (см. README, «Страницы и UX»)
const NewEventTypePage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', durationMinutes: '30' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const update = (field) => (event) => (
    setForm((current) => ({ ...current, [field]: event.target.value }))
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: apiError } = await createEventType({
        body: {
          title: form.title.trim(),
          description: form.description.trim(),
          durationMinutes: Number(form.durationMinutes),
        },
      });
      if (apiError) {
        setError(apiError.error ?? FALLBACK_ERROR);
        return;
      }
      navigate('/owner/event-types');
    } catch {
      setError(FALLBACK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h1>Новый тип встречи</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Название
          <input
            required
            maxLength={100}
            value={form.title}
            onChange={update('title')}
          />
        </label>
        <label>
          Описание
          <textarea
            rows={3}
            maxLength={500}
            value={form.description}
            onChange={update('description')}
          />
        </label>
        <label>
          Длительность
          <select value={form.durationMinutes} onChange={update('durationMinutes')}>
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={String(minutes)}>
                {minutes} минут
              </option>
            ))}
          </select>
        </label>
        {error && <p className="message error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Отправка…' : 'Создать тип'}
        </button>
      </form>
    </section>
  );
};

export default NewEventTypePage;
