import { Router } from 'express';

// Роуты типов встреч (заглушки — реализация следующим шагом):
// GET  /api/event-types                    — список типов встреч
// POST /api/event-types                    — создать тип встречи (владелец)
// GET  /api/event-types/:id/slots?date=…   — свободные слоты типа на дату
const router = Router();

export default router;
