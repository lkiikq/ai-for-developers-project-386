import { NavLink, Outlet } from 'react-router-dom';

// Шапка на всех страницах: бренд «Calendar» → /, вкладки «Записаться» и
// «Предстоящие события», кнопка «Владельцу» — вход в зону владельца
// (см. README, «Страницы и UX»)
const Layout = () => (
  <>
    <header className="header">
      <nav className="nav container">
        <NavLink to="/" className="brand">Calendar</NavLink>
        <div className="nav-links">
          <NavLink to="/event-types">Записаться</NavLink>
          <NavLink to="/owner/bookings">Предстоящие события</NavLink>
          <NavLink to="/owner/bookings" className="nav-owner">Владельцу</NavLink>
        </div>
      </nav>
    </header>
    <main className="container">
      <Outlet />
    </main>
  </>
);

export default Layout;
