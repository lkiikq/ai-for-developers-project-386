import { NavLink, Outlet } from 'react-router-dom';

const Layout = () => (
  <>
    <header className="header">
      <nav className="nav container">
        <NavLink to="/" className="brand">Календарь звонков</NavLink>
        <div className="nav-links">
          <NavLink to="/owner/bookings">Предстоящие встречи</NavLink>
          <NavLink to="/owner/event-types/new">Новый тип встречи</NavLink>
        </div>
      </nav>
    </header>
    <main className="container">
      <Outlet />
    </main>
  </>
);

export default Layout;
