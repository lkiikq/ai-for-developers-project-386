import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import App from '../App.jsx';
import { listEventTypes } from '../api/index.js';

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
  <MemoryRouter initialEntries={['/owner/event-types']}>
    <App />
  </MemoryRouter>,
);

beforeEach(() => {
  vi.mocked(listEventTypes).mockReset();
});

describe('Типы встреч владельца (/owner/event-types)', () => {
  it('показывает список типов и кнопку создания', async () => {
    vi.mocked(listEventTypes).mockResolvedValue({
      data: [{
        id: 'type-1', title: 'Созвон на 30 минут', description: 'Короткий созвон', durationMinutes: 30,
      }],
    });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Типы встреч' })).toBeInTheDocument();
    expect(screen.getByText('Созвон на 30 минут')).toBeInTheDocument();
    expect(screen.getByText('Короткий созвон')).toBeInTheDocument();
    expect(screen.getByText('30 мин')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Новый тип встречи' }))
      .toHaveAttribute('href', '/owner/event-types/new');
    expect(screen.getByRole('link', { name: 'Предстоящие события' }))
      .toHaveAttribute('href', '/owner/bookings');
  });

  it('показывает empty-состояние с кнопкой «Создать первый тип»', async () => {
    vi.mocked(listEventTypes).mockResolvedValue({ data: [] });
    renderPage();

    expect(await screen.findByText('Типов встреч пока нет.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Создать первый тип' }))
      .toHaveAttribute('href', '/owner/event-types/new');
  });

  it('показывает error и кнопку «Повторить»', async () => {
    const user = userEvent.setup();
    vi.mocked(listEventTypes)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ data: [] });
    renderPage();

    expect(
      await screen.findByText('Не удалось загрузить данные. Проверьте соединение и попробуйте снова.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Типов встреч пока нет.')).toBeInTheDocument();
  });

  it('ведёт на форму создания нового типа', async () => {
    const user = userEvent.setup();
    vi.mocked(listEventTypes).mockResolvedValue({ data: [] });
    renderPage();

    await user.click(screen.getByRole('link', { name: 'Новый тип встречи' }));

    expect(await screen.findByRole('button', { name: 'Создать тип' })).toBeInTheDocument();
    expect(screen.getByLabelText('Название')).toBeInTheDocument();
    expect(screen.getByLabelText('Описание')).toBeInTheDocument();
    expect(screen.getByLabelText('Длительность')).toBeInTheDocument();
  });
});
