import { Router } from 'express';

const router = Router();

// GET /api/health — проверка работоспособности
router.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;
