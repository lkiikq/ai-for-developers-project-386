import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CalendarGrid from './CalendarGrid.jsx';
import { isWeekend } from '../dates.js';

// Сетка календаря на неделе 9–15 марта 2026 (пн–вс): все даты внутри
// переданного окна `days`, как в BookEventTypePage
const WEEK = Array.from(
  { length: 7 },
  (_, i) => `2026-03-${String(9 + i).padStart(2, '0')}`,
);
const month = new Date(Date.UTC(2026, 2, 1));

const renderGrid = (overrides = {}) => {
  const onSelect = vi.fn();
  render(
    <CalendarGrid
      month={month}
      days={WEEK}
      counts={Object.fromEntries(WEEK.map((date) => [date, 3]))}
      selectedDate={null}
      onSelect={onSelect}
      onPrevMonth={() => {}}
      onNextMonth={() => {}}
      {...overrides}
    />,
  );
  return { onSelect };
};

describe('CalendarGrid: доступность дат', () => {
  it('выходной внутри окна приглушён, disabled и не выбирается', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderGrid();

    const weekendDate = WEEK.find((date) => isWeekend(date));
    const button = screen.getByRole('button', { name: weekendDate });

    expect(button).toBeDisabled();
    expect(button).toHaveClass('muted');
    expect(button).not.toHaveClass('available');
    expect(button).not.toHaveTextContent('св.');

    await user.click(button);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('рабочий день внутри окна выбираем: enabled, available, клик вызывает onSelect', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderGrid();

    const workDate = WEEK.find((date) => !isWeekend(date));
    const button = screen.getByRole('button', { name: workDate });

    expect(button).toBeEnabled();
    expect(button).toHaveClass('available');
    expect(button).toHaveTextContent('3 св.');

    await user.click(button);

    expect(onSelect).toHaveBeenCalledWith(workDate);
  });
});
