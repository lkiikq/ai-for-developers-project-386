import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import App from '../App.jsx';
import { listEventTypes } from '../api/index.js';

// Запросы к API в тестах не выполняются: SDK замокан целиком. listEventTypes
// отвечает пустым списком — страница записи рендерится в состоянии «нет типов».
vi.mock('../api/index.js', () => ({
  listEventTypes: vi.fn(),
  listBookings: vi.fn(),
  createEventType: vi.fn(),
  createBooking: vi.fn(),
  getEventTypeSlots: vi.fn(),
  health: vi.fn(),
}));

const renderLanding = () => render(
  <MemoryRouter initialEntries={['/']}>
    <App />
  </MemoryRouter>,
);

beforeEach(() => {
  vi.mocked(listEventTypes).mockReset().mockResolvedValue({ data: [] });
});

describe('Главная страница', () => {
  it('содержит ключевые тексты', () => {
    renderLanding();

    expect(screen.getByText('БЫСТРАЯ ЗАПИСЬ НА ЗВОНОК')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Calendar', level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText(/Один экран, понятные слоты, быстрая бронь/),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Что доступно прямо сейчас' }))
      .toBeInTheDocument();
    expect(screen.getByText('Слоты с 10:00 до 18:00 по будням, шаг 30 минут.'))
      .toBeInTheDocument();
    expect(screen.getByText('Проверка конфликта при бронировании.'))
      .toBeInTheDocument();
    expect(screen.getByText('Просмотр предстоящих событий в отдельном разделе.'))
      .toBeInTheDocument();
  });

  it('переходит по кнопке «Записаться →» на страницу записи', async () => {
    const user = userEvent.setup();
    renderLanding();

    await user.click(screen.getByRole('link', { name: 'Записаться →' }));

    expect(await screen.findByRole('heading', { name: 'Запись на звонок' }))
      .toBeInTheDocument();
    expect(
      screen.getByText('Пока нет доступных типов встреч. Загляните позже.'),
    ).toBeInTheDocument();
  });
});
