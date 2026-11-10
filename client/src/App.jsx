import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import LandingPage from './pages/LandingPage.jsx';
import EventTypesPage from './pages/EventTypesPage.jsx';
import BookEventTypePage from './pages/BookEventTypePage.jsx';
import NewEventTypePage from './pages/NewEventTypePage.jsx';
import OwnerBookingsPage from './pages/OwnerBookingsPage.jsx';

const App = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route index element={<LandingPage />} />
      <Route path="event-types" element={<EventTypesPage />} />
      <Route path="event-types/:id" element={<BookEventTypePage />} />
      <Route path="owner/event-types/new" element={<NewEventTypePage />} />
      <Route path="owner/bookings" element={<OwnerBookingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);

export default App;
