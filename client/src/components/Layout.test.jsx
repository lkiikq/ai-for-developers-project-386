import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import App from '../App.jsx';
import { listEventTypes } from '../api/index.js';

// Запросы к API в тестах не выполняются: SDK замокан целиком (см. README,
// «Приёмочная матрица тестов»).
vi.mock('../api/index.js', () => ({
  listEventTypes: vi.fn(),
  listBookings: vi.fn(),
  createEventType: vi.fn(),
  createBooking: vi.fn(),
  getEventTypeSlots: vi.fn(),
  health: vi.fn(),
}));

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <App />
  </MemoryRouter>,
);

beforeEach(() => {
  vi.mocked(listEventTypes).mockReset().mockResolvedValue({ data: [] });
});

describe('Шапка (Layout)', () => {
  it('бренд «Calendar» ведёт на главную', () => {
    renderAt('/event-types');

    expect(screen.getByRole('link', { name: 'Calendar' }))
      .toHaveAttribute('href', '/');
  });

  it('вкладка «Записаться» ведёт на список типов', () => {
    renderAt('/');

    expect(screen.getByRole('link', { name: 'Записаться' }))
      .toHaveAttribute('href', '/event-types');
  });

  it('вкладка «Предстоящие события» ведёт на брони владельца', () => {
    renderAt('/');

    expect(screen.getByRole('link', { name: 'Предстоящие события' }))
      .toHaveAttribute('href', '/owner/bookings');
  });

  it('кнопка «Владельцу» ведёт в зону владельца', () => {
    renderAt('/');

    expect(screen.getByRole('link', { name: 'Владельцу' }))
      .toHaveAttribute('href', '/owner/bookings');
  });
});
