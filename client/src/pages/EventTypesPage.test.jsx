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
  <MemoryRouter initialEntries={['/event-types']}>
    <App />
  </MemoryRouter>,
);

const types = [
  {
    id: 'type-1', title: 'Созвон на 30 минут', description: 'Короткий созвон', durationMinutes: 30,
  },
  {
    id: 'type-2', title: 'Разбор', description: 'Длинный разбор', durationMinutes: 90,
  },
];

beforeEach(() => {
  vi.mocked(listEventTypes).mockReset();
});

describe('Страница записи (/event-types)', () => {
  it('показывает индикатор «Загрузка…» во время запроса', () => {
    vi.mocked(listEventTypes).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('показывает список типов из мока', async () => {
    vi.mocked(listEventTypes).mockResolvedValue({ data: types });
    renderPage();

    expect(await screen.findByText('Созвон на 30 минут')).toBeInTheDocument();
    expect(screen.getByText('Короткий созвон')).toBeInTheDocument();
    expect(screen.getByText('30 мин')).toBeInTheDocument();
    expect(screen.getByText('Разбор')).toBeInTheDocument();
    expect(screen.getByText('90 мин')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Выбрать' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Выбрать' })[0])
      .toHaveAttribute('href', '/event-types/type-1');
  });

  it('показывает empty-текст, когда типов нет', async () => {
    vi.mocked(listEventTypes).mockResolvedValue({ data: [] });
    renderPage();

    expect(
      await screen.findByText('Пока нет доступных типов встреч. Загляните позже.'),
    ).toBeInTheDocument();
  });

  it('показывает error и кнопку «Повторить», повтор запрашивает данные снова', async () => {
    const user = userEvent.setup();
    vi.mocked(listEventTypes)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ data: types });
    renderPage();

    expect(
      await screen.findByText('Не удалось загрузить данные. Проверьте соединение и попробуйте снова.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Созвон на 30 минут')).toBeInTheDocument();
    expect(
      screen.queryByText('Не удалось загрузить данные. Проверьте соединение и попробуйте снова.'),
    ).not.toBeInTheDocument();
  });

  it('кнопка «Выбрать» открывает страницу слотов типа', async () => {
    const user = userEvent.setup();
    vi.mocked(listEventTypes).mockResolvedValue({ data: types });
    renderPage();

    await user.click((await screen.findAllByRole('link', { name: 'Выбрать' }))[0]);

    expect(await screen.findByRole('heading', { name: 'Запись на звонок' }))
      .toBeInTheDocument();
  });
});
