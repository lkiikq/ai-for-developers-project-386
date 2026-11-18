import { Link } from 'react-router-dom';

// Главная страница: пилюля-бейдж, H1 «Calendar», подзаголовок, кнопка
// «Записаться →» и карточка «Что доступно прямо сейчас» (см. README,
// «Страницы и UX»)
const LandingPage = () => (
  <section className="landing">
    <p className="badge">БЫСТРАЯ ЗАПИСЬ НА ЗВОНОК</p>
    <h1>Calendar</h1>
    <p className="subtitle">
      Один экран, понятные слоты, быстрая бронь. Выберите время и запишитесь
      на звонок без лишних шагов.
    </p>
    <Link className="cta" to="/event-types">Записаться →</Link>

    <div className="card landing-card">
      <h2>Что доступно прямо сейчас</h2>
      <ul>
        <li>Слоты с 10:00 до 18:00 по будням, шаг 30 минут.</li>
        <li>Проверка конфликта при бронировании.</li>
        <li>Просмотр предстоящих событий в отдельном разделе.</li>
      </ul>
    </div>
  </section>
);

export default LandingPage;
