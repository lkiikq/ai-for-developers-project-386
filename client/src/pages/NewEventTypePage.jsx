import { useState } from 'react';
import { createEventType } from '../api/index.js';

const initialForm = { title: '', description: '', durationMinutes: 30 };

// Страница владельца: создание типа встречи (см. README, сценарий 1)
const NewEventTypePage = () => {
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const update = (field) => (event) => (
    setForm((current) => ({ ...current, [field]: event.target.value }))
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const { data, error } = await createEventType({
        body: {
          title: form.title.trim(),
          description: form.description.trim(),
          durationMinutes: Number(form.durationMinutes),
        },
      });
      if (error) {
        setFeedback({
          type: 'error',
          text: 'Не удалось создать тип встречи. Проверьте данные.',
        });
      } else {
        setFeedback({ type: 'success', text: `Тип встречи «${data.title}» создан.` });
        setForm(initialForm);
      }
    } catch {
      setFeedback({
        type: 'error',
        text: 'Не удалось создать тип встречи. Попробуйте ещё раз.',
      });
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
            value={form.title}
            placeholder="Созвон на 30 минут"
            onChange={update('title')}
          />
        </label>
        <label>
          Описание
          <textarea
            rows={3}
            value={form.description}
            onChange={update('description')}
          />
        </label>
        <label>
          Длительность, минут
          <input
            required
            type="number"
            min={1}
            step={1}
            value={form.durationMinutes}
            onChange={update('durationMinutes')}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Создать'}
        </button>
      </form>
      {feedback && <p className={`message ${feedback.type}`}>{feedback.text}</p>}
    </section>
  );
};

export default NewEventTypePage;
