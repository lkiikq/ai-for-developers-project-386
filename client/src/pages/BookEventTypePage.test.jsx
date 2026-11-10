import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import App from '../App.jsx';
import {
  createBooking, getEventTypeSlots, listEventTypes,
} from '../api/index.js';
import { getBookingWindow, isWeekend } from '../dates.js';

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

const type = {
  id: 'type-1', title: 'Созвон на 30 минут', description: 'Короткий созвон', durationMinutes: 30,
};
const freeSlot = { startTime: '10:00', endTime: '10:30' };

// Первая доступная (будняя) дата окна бронирования — её кнопка в календаре
const availableDate = getBookingWindow().find((date) => !isWeekend(date));

const renderPage = (id = type.id) => render(
  <MemoryRouter initialEntries={[`/event-types/${id}`]}>
    <App />
  </MemoryRouter>,
);

// Дожидаемся конца первоначальной загрузки: в календаре появились даты
const waitForSlots = async () => {
  await screen.findByRole('button', { name: availableDate });
};

beforeEach(() => {
  vi.mocked(listEventTypes).mockReset().mockResolvedValue({ data: [type] });
  vi.mocked(getEventTypeSlots).mockReset()
    .mockImplementation(() => Promise.resolve({ data: [freeSlot] }));
  vi.mocked(createBooking).mockReset();
});

describe('Страница слотов (/event-types/:id)', () => {
  it('показывает индикатор «Загрузка…» во время запроса', () => {
    vi.mocked(listEventTypes).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('выбор даты запрашивает слоты этой даты', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForSlots();

    vi.mocked(getEventTypeSlots).mockClear();
    await user.click(screen.getByRole('button', { name: availableDate }));

    expect(getEventTypeSlots).toHaveBeenCalledWith({
      path: { id: type.id },
      query: { date: availableDate },
    });
    expect(await screen.findByRole('button', { name: '10:00 - 10:30' })).toBeInTheDocument();
  });

  it('выбор слота активирует кнопку «Продолжить»', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForSlots();

    const continueButton = screen.getByRole('button', { name: 'Продолжить' });
    expect(continueButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: availableDate }));
    await user.click(await screen.findByRole('button', { name: '10:00 - 10:30' }));

    expect(continueButton).toBeEnabled();
  });

  it('сетка дня показывает «Занято» для слотов, отсутствующих в ответе API', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForSlots();

    await user.click(screen.getByRole('button', { name: availableDate }));

    expect(await screen.findByRole('button', { name: '10:00 - 10:30' })).toBeInTheDocument();
    expect(screen.getByText('10:00 - 10:30').closest('li'))
      .toHaveTextContent('Свободно');
    expect(screen.getByText('10:30 - 11:00').closest('li'))
      .toHaveTextContent('Занято');
    expect(screen.getByText('17:30 - 18:00').closest('li'))
      .toHaveTextContent('Занято');
  });

  it('404 типа → «Тип встречи не найден.» со ссылкой «К списку типов»', async () => {
    vi.mocked(listEventTypes).mockResolvedValue({ data: [] });
    renderPage('unknown-id');

    expect(await screen.findByText('Тип встречи не найден.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К списку типов' }))
      .toHaveAttribute('href', '/event-types');
  });

  it('ошибка загрузки → текст и кнопка «Повторить», повтор восстанавливает страницу', async () => {
    const user = userEvent.setup();
    vi.mocked(getEventTypeSlots).mockRejectedValueOnce(new Error('network'));
    renderPage();

    expect(
      await screen.findByText('Не удалось загрузить данные. Проверьте соединение и попробуйте снова.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('button', { name: availableDate })).toBeInTheDocument();
  });
});

describe('Флоу брони', () => {
  it('слот → форма → успех → «Забронировать еще» возвращает к слотам', async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockResolvedValue({
      data: {
        id: 'b-1', eventTypeId: type.id, date: availableDate, startTime: '10:00', endTime: '10:30', guestName: 'Иван', guestEmail: 'ivan@example.com',
      },
    });
    renderPage();
    await waitForSlots();

    await user.click(screen.getByRole('button', { name: availableDate }));
    await user.click(await screen.findByRole('button', { name: '10:00 - 10:30' }));
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));

    expect(await screen.findByRole('heading', { name: 'Подтверждение записи' }))
      .toBeInTheDocument();
    await user.type(screen.getByLabelText('Имя'), 'Иван');
    await user.type(screen.getByLabelText('Email'), 'ivan@example.com');
    await user.click(screen.getByRole('button', { name: 'Подтвердить запись' }));

    expect(await screen.findByText('Бронь подтверждена. До встречи!')).toBeInTheDocument();
    expect(createBooking).toHaveBeenCalledWith({
      body: {
        eventTypeId: type.id,
        date: availableDate,
        startTime: '10:00',
        guestName: 'Иван',
        guestEmail: 'ivan@example.com',
      },
    });

    await user.click(screen.getByRole('button', { name: 'Забронировать еще' }));

    expect(await screen.findByRole('button', { name: 'Продолжить' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeDisabled();
    expect(getEventTypeSlots).toHaveBeenCalled();
  });

  it('кнопка «Изменить» возвращает к выбору слота', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForSlots();

    await user.click(screen.getByRole('button', { name: availableDate }));
    await user.click(await screen.findByRole('button', { name: '10:00 - 10:30' }));
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));
    expect(await screen.findByRole('heading', { name: 'Подтверждение записи' }))
      .toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Изменить' }));

    expect(await screen.findByRole('button', { name: 'Продолжить' })).toBeInTheDocument();
  });
});

describe('409-флоу', () => {
  it('после 409 возвращает к слотам, перезапрашивает их и показывает сообщение', async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockResolvedValue({
      error: { error: 'Это время уже занято. Выберите другое время.' },
      response: { status: 409 },
    });
    renderPage();
    await waitForSlots();

    await user.click(screen.getByRole('button', { name: availableDate }));
    await user.click(await screen.findByRole('button', { name: '10:00 - 10:30' }));
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));
    await user.type(screen.getByLabelText('Имя'), 'Иван');
    await user.type(screen.getByLabelText('Email'), 'ivan@example.com');

    vi.mocked(getEventTypeSlots).mockClear();
    await user.click(screen.getByRole('button', { name: 'Подтвердить запись' }));

    expect(
      await screen.findByText('Это время уже занято. Выберите другое время.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeDisabled();
    expect(getEventTypeSlots).toHaveBeenCalledWith({
      path: { id: type.id },
      query: { date: availableDate },
    });
  });

  it('ошибка не-409 показывает текст сервера на шаге подтверждения', async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockResolvedValue({
      error: { error: 'Имя обязательно.' },
      response: { status: 400 },
    });
    renderPage();
    await waitForSlots();

    await user.click(screen.getByRole('button', { name: availableDate }));
    await user.click(await screen.findByRole('button', { name: '10:00 - 10:30' }));
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));
    await user.type(screen.getByLabelText('Имя'), 'Иван');
    await user.type(screen.getByLabelText('Email'), 'ivan@example.com');
    await user.click(screen.getByRole('button', { name: 'Подтвердить запись' }));

    expect(await screen.findByText('Имя обязательно.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Подтвердить запись' })).toBeEnabled();
  });

  it('показывает «Отправка…» пока бронь отправляется', async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockReturnValue(new Promise(() => {}));
    renderPage();
    await waitForSlots();

    await user.click(screen.getByRole('button', { name: availableDate }));
    await user.click(await screen.findByRole('button', { name: '10:00 - 10:30' }));
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));
    await user.type(screen.getByLabelText('Имя'), 'Иван');
    await user.type(screen.getByLabelText('Email'), 'ivan@example.com');
    await user.click(screen.getByRole('button', { name: 'Подтвердить запись' }));

    expect(await screen.findByRole('button', { name: 'Отправка…' })).toBeDisabled();
  });
});
