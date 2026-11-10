import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// В dev-режиме фронтенд (localhost:5173) проксирует /api/* на бэкенд
// (localhost:3000) — см. README.
export default defineConfig({
  plugins: [react()],
  server: {
    // Явный IPv4-хост: иначе Vite слушает только ::1, а pitchfork
    // (mise daemons) проверяет готовность порта по 127.0.0.1
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
