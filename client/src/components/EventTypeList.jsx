import { Link } from 'react-router-dom';

const EventTypeList = ({ eventTypes }) => (
  <ul className="card-list">
    {eventTypes.map((type) => (
      <li key={type.id} className="card">
        <h2>
          <Link to={`/event-types/${type.id}`}>{type.title}</Link>
        </h2>
        <p>{type.description}</p>
        <p className="muted">{type.durationMinutes} мин</p>
      </li>
    ))}
  </ul>
);

export default EventTypeList;
