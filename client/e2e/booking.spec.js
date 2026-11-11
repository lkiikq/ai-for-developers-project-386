import { expect, test } from '@playwright/test';

// Сквозной браузерный сценарий (тикет #12): гость записывается на свободный
// слот через настоящий бэкенд, владелец видит бронь в списке. API не
// подменяется — только реальные запросы; данные прогона уникальны, чтобы
// параллельные запуски не конфликтовали.

// «Сегодня» в часовом поясе API (Asia/Almaty), YYYY-MM-DD
const todayStr = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Almaty',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

// dateStr + N календарных дней (календарная арифметика, не зависит
// от часового пояса машины)
const addDays = (dateStr, days) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const isWeekend = (dateStr) => {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

// Ближайший рабочий день окна бронирования (завтра … завтра+13, пн–пт)
const nearestWorkingDay = () => {
  let date = addDays(todayStr(), 1);
  while (isWeekend(date)) date = addDays(date, 1);
  return date;
};

test('гость записывается на свободный слот, владелец видит бронь', async ({ page, request }) => {
  // Уникальные данные прогона: in-memory стор живёт дольше одного запуска
  // (reuseExistingServer), поэтому и тип, и гость генерируются заново
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title = `Тип E2E ${runId}`;
  const guestName = `Гость ${runId}`;
  const guestEmail = `guest-${runId}@example.com`;

  // Подготовка: тип встречи создаётся реальным POST на реальный сервер
  // (не мок — webServer поднят Playwright). Гость сам тип не создаёт.
  const created = await request.post('/api/event-types', {
    data: { title, description: 'Сквозной e2e-сценарий', durationMinutes: 30 },
  });
  expect(created.ok()).toBe(true);

  // Гость: главная → «Записаться →» → карточка типа → «Выбрать».
  // Одна повторная загрузка списка — защита от транзиентного сбоя
  // прокси/dev-сервера (при переиспользовании уже запущенных серверов).
  await page.goto('/');
  await page.getByRole('link', { name: 'Записаться →' }).click();
  const card = page.locator('.card', { hasText: title });
  const retry = page.getByRole('button', { name: 'Повторить' });
  await expect(async () => {
    if (await retry.isVisible().catch(() => false)) await retry.click();
    await expect(card).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20_000 });
  await card.getByRole('link', { name: 'Выбрать' }).click();

  // Календарь: ближайший рабочий день (окно всегда содержит пн–пт)
  const date = nearestWorkingDay();
  await page.locator(`button[aria-label="${date}"]`).click();

  // Свободные слоты — кнопки .slot-time (занятые — span). Ждём загрузки
  // и выбираем слот по seed прогона, чтобы параллельные запуски
  // не бронировали один и тот же старт.
  const freeSlots = page.locator('button.slot-time');
  await expect(freeSlots.first()).toBeVisible();
  const slotCount = await freeSlots.count();
  const slot = freeSlots.nth(Math.floor(Math.random() * slotCount));
  const slotText = (await slot.innerText()).trim();
  const startTime = slotText.split(' - ')[0];
  await slot.click();

  // Подтверждение: «Продолжить» → имя + email → «Подтвердить запись»
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await page.getByLabel('Имя').fill(guestName);
  await page.getByLabel('Email').fill(guestEmail);
  await page.getByRole('button', { name: 'Подтвердить запись' }).click();
  await expect(page.getByText('Бронь подтверждена. До встречи!')).toBeVisible();

  // Владелец: вкладка «Предстоящие события» → карточка созданной брони
  await page.getByRole('link', { name: 'Предстоящие события' }).click();
  await expect(page.getByRole('heading', { name: 'Предстоящие события' })).toBeVisible();
  const bookingCard = page.locator('.booking-card', { hasText: guestEmail });
  await expect(bookingCard).toBeVisible();
  await expect(bookingCard).toContainText(guestName);
  await expect(bookingCard).toContainText(`Слот: ${date}-${startTime}`);
});
