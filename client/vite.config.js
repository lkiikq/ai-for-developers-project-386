import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// В dev-режиме фронтенд (localhost:5173) проксирует /api/* на бэкенд
// (localhost:3000) — см. README.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
