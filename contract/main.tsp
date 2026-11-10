import "@typespec/http";

using TypeSpec.Http;

@service(#{ title: "Календарь звонков API" })
namespace CallCalendar;

/** Тип встречи */
model EventType {
  /** Уникальный идентификатор (UUID) */
  id: string;

  /** Название встречи */
  title: string;

  /** Описание встречи */
  description: string;

  /** Длительность в минутах */
  durationMinutes: int32;
}

/**
 * Данные для создания типа встречи.
 * Все строковые поля триммятся на сервере до валидации и хранения;
 * ограничения длины применяются после тримминга.
 */
model EventTypeInput {
  /**
   * Название встречи: 1–100 символов после тримминга.
   * Дубликаты названий разрешены — типы различаются по id.
   */
  @minLength(1)
  @maxLength(100)
  title: string;

  /** Описание встречи: необязательное, допустима пустая строка, до 500 символов после тримминга */
  @maxLength(500) description: string;

  /** Длительность в минутах: кратна 30 — одно из значений 30, 60, 90, 120 (кратность проверяется сервером) */
  @minValue(30)
  @maxValue(120)
  durationMinutes: int32;
}

/** Свободный слот для записи */
model Slot {
  /** Время начала, HH:mm (Asia/Almaty) */
  startTime: string;

  /** Время окончания, HH:mm (Asia/Almaty) */
  endTime: string;
}

/** Бронирование */
model Booking {
  /** Уникальный идентификатор (UUID) */
  id: string;

  /** Идентификатор типа встречи */
  eventTypeId: string;

  /** Дата, YYYY-MM-DD (Asia/Almaty) */
  date: string;

  /** Время начала, HH:mm (Asia/Almaty) */
  startTime: string;

  /** Время окончания, HH:mm (Asia/Almaty) */
  endTime: string;

  /** Имя гостя */
  guestName: string;

  /** Email гостя */
  guestEmail: string;
}

/**
 * Данные для создания бронирования.
 * Все строковые поля триммятся на сервере до валидации и хранения;
 * ограничения длины применяются после тримминга.
 */
model BookingInput {
  /** Идентификатор типа встречи */
  eventTypeId: string;

  /** Дата, YYYY-MM-DD (Asia/Almaty) */
  date: string;

  /** Время начала, HH:mm (Asia/Almaty) */
  startTime: string;

  /** Имя гостя: 1–100 символов после тримминга */
  @minLength(1)
  @maxLength(100)
  guestName: string;

  /** Email гостя: простая проверка формата — `^[^\s@]+@[^\s@]+\.[^\s@]+$` после тримминга, до 254 символов */
  @format("email")
  @maxLength(254)
  guestEmail: string;
}

/** Статус сервиса */
model HealthStatus {
  status: string;
}

/** Формат ошибки API */
@error
model ApiError {
  error: string;
}

alias Created<T> = {
  @statusCode statusCode: 201;
  @body body: T;
};

alias BadRequest = {
  @statusCode statusCode: 400;
  @body body: ApiError;
};

alias NotFound = {
  @statusCode statusCode: 404;
  @body body: ApiError;
};

alias Conflict = {
  @statusCode statusCode: 409;
  @body body: ApiError;
};

/** Проверка работоспособности */
@route("/api/health")
@get
op health(): HealthStatus;

/** Список типов встреч */
@route("/api/event-types")
@get
op listEventTypes(): EventType[];

/** Создать тип встречи (владелец). 400 — невалидные поля: «Название обязательно.», «Название не должно превышать 100 символов.», «Описание не должно превышать 500 символов.», «Длительность должна быть 30, 60, 90 или 120 минут.» */
@route("/api/event-types")
@post
op createEventType(@body body: EventTypeInput): Created<EventType> | BadRequest;

/**
 * Свободные слоты типа на дату (внутри окна 14 дней с завтрашнего дня).
 * Запрос на выходной (сб/вс) — пустой список, не ошибка.
 * 400 — «Некорректная дата: ожидается формат YYYY-MM-DD.», «Дата вне окна бронирования: запись открыта на 14 дней, начиная с завтрашнего дня.», «Параметр date обязателен.»
 * 404 — «Тип встречи не найден.»
 */
@route("/api/event-types/{id}/slots")
@get
op getEventTypeSlots(@path id: string, @query date: string): Slot[] | BadRequest | NotFound;

/**
 * Предстоящие бронирования всех типов (владелец).
 * «Предстоящие» — по дате: все брони с сегодняшней даты включительно (Asia/Almaty); уже начавшиеся сегодня входят в список.
 * Сортировка — по дате и времени встречи, ближайшие выше.
 */
@route("/api/bookings")
@get
op listBookings(): Booking[];

/**
 * Создать бронирование (гость). Проверка пересечения и создание выполняются атомарно.
 * 400 — слот не предусмотрен расписанием или невалидные поля: «Некорректная дата: ожидается формат YYYY-MM-DD.», «Дата вне окна бронирования: запись открыта на 14 дней, начиная с завтрашнего дня.», «Некорректное время начала: ожидается формат HH:mm.», «Выбранное время недоступно для записи.», «Имя обязательно.», «Некорректный email.»
 * 404 — «Тип встречи не найден.»
 * 409 — слот валиден по расписанию, но пересекается с существующей бронью: «Это время уже занято. Выберите другое время.»
 */
@route("/api/bookings")
@post
op createBooking(@body body: BookingInput): Created<Booking> | BadRequest | NotFound | Conflict;
