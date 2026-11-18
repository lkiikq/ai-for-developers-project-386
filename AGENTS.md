# AGENTS.md

Полное описание проекта — в [README.md](README.md): стек, доменные правила, contract-first пайплайн, «Правила для ИИ-агентов». Читать перед работой.

## Команды (из корня)

- `mise run install` — установить зависимости всех пакетов
- `mise run check` — **все проверки**: линтеры, тесты, сборка, соответствие сгенерированных файлов контракту. Запускать после изменений; та же команда работает в GitHub Actions (`.github/workflows/check.yml`)
- `mise run lint` / `mise run test` / `mise run build` — точечные проверки
- `mise daemons start|stop|ls` — фоновые dev-серверы (бэкенд :3000, фронтенд :5173)
- npm-команды пакетов — таблица «Команды для разработки» в README

Инструменты и их версии зафиксированы в `mise.toml` (node, hk, pitchfork). После клонирования: `mise install`, затем `hk install --mise` — поставит git-хуки из `hk.pkl`.

## Правила, не читающиеся из кода

- **Коммиты — только Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:` и т.д. Проверяется commit-msg хуком (hk).
- **Коммит реализации ссылается на тикет, который он закрывает**: `тип: описание (#номер)`, например `feat: запись на свободный слот (#12)`. Номер в скобках GitHub превращает в ссылку на тикет — по истории видно, какой коммит какую задачу делал.
- Не редактировать `.github/workflows/hexlet-check.yml`.
- **Генерируемые пути руками не править — только через `mise run generate`** (tsp compile + openapi-ts): `contract/openapi.yaml` и `client/src/api/generated/`. Генератора артефактов для сервера (Express) нет — бэкенд реализуется по `contract/openapi.yaml` вручную. Сверка этих путей с git — `mise run check:generated`, она же входит в `mise run check`.
- Остальные инварианты (in-memory хранилище, contract-first, доменные правила) — см. README, раздел «Правила для ИИ-агентов».

## Agent skills

### Issue tracker

Issues и спеки живут в GitHub Issues этого репозитория; работа идёт через `gh` CLI (ставится `mise install`, затем нужен `gh auth login`). См. `docs/agents/issue-tracker.md`.

### Triage labels

Дефолтный набор: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. См. `docs/agents/triage-labels.md`.

### Domain docs

Single-context: один `GLOSSARY.md` в корне + `docs/adr/`. См. `docs/agents/domain.md`.
