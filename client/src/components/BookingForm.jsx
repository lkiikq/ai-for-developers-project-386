import { useState } from 'react';

// Форма подтверждения записи: «Имя», «Email», кнопка «Подтвердить запись»
// (при отправке — «Отправка…»), текст ошибки сервера у формы
// (см. README, «Страницы и UX»)
const BookingForm = ({ busy, error, onSubmit }) => {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ guestName: guestName.trim(), guestEmail: guestEmail.trim() });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        Имя
        <input
          required
          maxLength={100}
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
        />
      </label>
      <label>
        Email
        <input
          required
          type="email"
          maxLength={254}
          value={guestEmail}
          onChange={(event) => setGuestEmail(event.target.value)}
        />
      </label>
      {error && <p className="message error">{error}</p>}
      <button type="submit" className="form-submit" disabled={busy}>
        {busy ? 'Отправка…' : 'Подтвердить запись'}
      </button>
    </form>
  );
};

export default BookingForm;
