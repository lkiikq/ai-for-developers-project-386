import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import App from '../App.jsx';
import { createEventType, listEventTypes } from '../api/index.js';

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
  <MemoryRouter initialEntries={['/owner/event-types/new']}>
    <App />
  </MemoryRouter>,
);

beforeEach(() => {
  vi.mocked(createEventType).mockReset();
  vi.mocked(listEventTypes).mockReset().mockResolvedValue({ data: [] });
});

const fillForm = async (user) => {
  await user.type(screen.getByLabelText('Название'), 'Созвон на 30 минут');
  await user.type(screen.getByLabelText('Описание'), 'Короткий созвон');
  await user.selectOptions(screen.getByLabelText('Длительность'), '60');
};

describe('Новый тип встречи (/owner/event-types/new)', () => {
  it('имеет HTML5-валидацию: required, maxLength и длительность из набора', () => {
    renderPage();

    const title = screen.getByLabelText('Название');
    expect(title).toBeRequired();
    expect(title).toHaveAttribute('maxlength', '100');
    const description = screen.getByLabelText('Описание');
    expect(description).toHaveAttribute('maxlength', '500');
    const duration = screen.getByLabelText('Длительность');
    expect([...duration.options].map((option) => option.value))
      .toEqual(['30', '60', '90', '120']);
  });

  it('после успешного создания редиректит на список типов владельца', async () => {
    const user = userEvent.setup();
    const created = {
      id: 'new-id', title: 'Созвон на 30 минут', description: 'Короткий созвон', durationMinutes: 60,
    };
    vi.mocked(createEventType).mockResolvedValue({ data: created });
    // POST синхронен: список после редиректа уже содержит созданный тип
    vi.mocked(listEventTypes).mockResolvedValue({ data: [created] });
    renderPage();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Создать тип' }));

    expect(createEventType).toHaveBeenCalledWith({
      body: {
        title: 'Созвон на 30 минут',
        description: 'Короткий созвон',
        durationMinutes: 60,
      },
    });
    expect(await screen.findByRole('heading', { name: 'Типы встреч' }))
      .toBeInTheDocument();
    expect(await screen.findByText('Созвон на 30 минут')).toBeInTheDocument();
    expect(listEventTypes).toHaveBeenCalled();
  });

  it('показывает текст ошибки сервера у формы и снова даёт отправить', async () => {
    const user = userEvent.setup();
    vi.mocked(createEventType)
      .mockResolvedValueOnce({ error: { error: 'Название не должно превышать 100 символов.' }, response: { status: 400 } })
      .mockResolvedValue({
        data: {
          id: 'new-id', title: 'Созвон', description: '', durationMinutes: 30,
        },
      });
    renderPage();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Создать тип' }));

    expect(await screen.findByText('Название не должно превышать 100 символов.'))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать тип' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Создать тип' }));

    expect(await screen.findByRole('heading', { name: 'Типы встреч' }))
      .toBeInTheDocument();
  });

  it('показывает «Отправка…» пока форма отправляется', async () => {
    const user = userEvent.setup();
    vi.mocked(createEventType).mockReturnValue(new Promise(() => {}));
    renderPage();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Создать тип' }));

    expect(await screen.findByRole('button', { name: 'Отправка…' })).toBeDisabled();
  });
});
