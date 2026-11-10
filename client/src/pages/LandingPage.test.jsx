import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import App from '../App.jsx';
import LandingPage from './LandingPage.jsx';

// Запросы к API в тестах не выполняются: модуль подменяется целиком.
// listEventTypes отвечает пустым списком — страница записи рендерится
// в состоянии «нет типов встреч».
vi.mock('../api/index.js', () => ({
  listEventTypes: vi.fn().mockResolvedValue({ data: [] }),
  listBookings: vi.fn(),
  createEventType: vi.fn(),
  createBooking: vi.fn(),
  getEventTypeSlots: vi.fn(),
}));

const renderLanding = () => render(
  <MemoryRouter>
    <LandingPage />
  </MemoryRouter>,
);

describe('Главная страница', () => {
  it('рассказывает о сервисе', () => {
    renderLanding();

    expect(screen.getByRole('heading', { name: 'Календарь звонков' })).toBeInTheDocument();
    expect(screen.getByText(/бронирования времени звонков/)).toBeInTheDocument();
  });

  it('имеет кнопку перехода к записи', () => {
    renderLanding();

    expect(screen.getByRole('link', { name: 'Записаться' }))
      .toHaveAttribute('href', '/event-types');
  });

  it('ведёт на страницу записи', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: 'Записаться' }));

    expect(
      await screen.findByRole('heading', { name: 'Выберите тип встречи' }),
    ).toBeInTheDocument();
  });
});
