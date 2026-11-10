import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import App from '../App.jsx';
import { listBookings } from '../api/index.js';

// SDK замокан: реальный бэкенд из фронтенд-тестов не поднимаем (см. README,
// «Приёмочная матрица тестов»)
vi.mock('../api/index.js', () => ({
  listEventTypes: vi.fn(),
  listBookings: vi.fn(),
  createEventType: vi.fn(),
  createBooking: vi.fn(),
  getEventTypeSlots: vi.fn(),
  health: vi.fn(),
}));

const renderPage = () => render(
  <MemoryRouter initialEntries={['/owner/bookings']}>
    <App />
  </MemoryRouter>,
);

const bookings = [
  {
    id: 'b-2',
    eventTypeId: 'type-1',
    date: '2026-04-02',
    startTime: '11:00',
    endTime: '11:30',
    guestName: 'Иван Петров',
    guestEmail: 'ivan@example.com',
    createdAt: '2026-03-20T09:15:00.000Z',
  },
  {
    id: 'b-1',
    eventTypeId: 'type-1',
    date: '2026-04-01',
    startTime: '10:00',
    endTime: '10:30',
    guestName: 'Анна Смирнова',
    guestEmail: 'anna@example.com',
    createdAt: '2026-03-19T14:05:00.000Z',
  },
];

beforeEach(() => {
  vi.mocked(listBookings).mockReset();
});

describe('Предстоящие события (/owner/bookings)', () => {
  it('рендерит карточки броней, ближайшие выше', async () => {
    vi.mocked(listBookings).mockResolvedValue({ data: bookings });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Предстоящие события' }))
      .toBeInTheDocument();
    const names = screen.getAllByText(/(Иван Петров|Анна Смирнова)/)
      .map((node) => node.textContent);
    expect(names).toEqual(['Анна Смирнова', 'Иван Петров']);
    expect(screen.getByText('ivan@example.com')).toBeInTheDocument();
    expect(screen.getByText('Слот: 2026-04-02-11:00')).toBeInTheDocument();
    expect(screen.getByText('Создано: 20.03.2026, 09:15')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Типы встреч' }))
      .toHaveAttribute('href', '/owner/event-types');
  });

  it('показывает empty-текст «Предстоящих событий нет.»', async () => {
    vi.mocked(listBookings).mockResolvedValue({ data: [] });
    renderPage();

    expect(await screen.findByText('Предстоящих событий нет.')).toBeInTheDocument();
  });

  it('показывает error и кнопку «Повторить»', async () => {
    const user = userEvent.setup();
    vi.mocked(listBookings)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ data: [] });
    renderPage();

    expect(
      await screen.findByText('Не удалось загрузить данные. Проверьте соединение и попробуйте снова.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Предстоящих событий нет.')).toBeInTheDocument();
  });

  it('показывает индикатор «Загрузка…» во время запроса', () => {
    vi.mocked(listBookings).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });
});
