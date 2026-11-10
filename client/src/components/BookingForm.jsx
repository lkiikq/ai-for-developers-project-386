import { useState } from 'react';

const BookingForm = ({ busy, onSubmit }) => {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ guestName: guestName.trim(), guestEmail: guestEmail.trim() });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        Ваше имя
        <input
          required
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
        />
      </label>
      <label>
        Email
        <input
          required
          type="email"
          value={guestEmail}
          onChange={(event) => setGuestEmail(event.target.value)}
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Бронируем…' : 'Подтвердить запись'}
      </button>
    </form>
  );
};

export default BookingForm;
