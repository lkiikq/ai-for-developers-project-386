import { Link } from 'react-router-dom';

// Карточки типов встреч: название, описание, длительность («N мин»);
// на странице записи — кнопка «Выбрать» → /event-types/:id
// (см. README, «Страницы и UX»)
const EventTypeList = ({ eventTypes, selectable = false }) => (
  <ul className="card-list">
    {eventTypes.map((type) => (
      <li key={type.id} className="card">
        <h2>{type.title}</h2>
        <p>{type.description}</p>
        <p className="muted">{type.durationMinutes} мин</p>
        {selectable && (
          <Link className="card-link" to={`/event-types/${type.id}`}>
            Выбрать
          </Link>
        )}
      </li>
    ))}
  </ul>
);

export default EventTypeList;
