# syntax=docker/dockerfile:1

# Multi-stage сборка: один образ с бэкендом и собранным фронтендом (см. README).
# Этап 1: сборка фронтенда (Vite -> client/dist).
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client ./
RUN npm run build

# Этап 2: бэкенд + собранный фронтенд. Express раздаёт API и статику
# фронтенда на порту 3000.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server ci --omit=dev
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist
EXPOSE 3000
CMD ["node", "server/src/index.js"]
