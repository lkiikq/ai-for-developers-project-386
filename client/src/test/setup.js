import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Авто-cleanup @testing-library работает только при globals: true,
// а глобалы Vitest мы не включаем (явные импорты) — чистим вручную
afterEach(cleanup);
