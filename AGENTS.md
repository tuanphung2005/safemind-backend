# AGENTS

This file helps coding agents work productively in this repository.

## Scope

- Project root for all backend work: `safemind-backend/`
- Always run package and Prisma commands from this folder.

## Fast Start

- Install: `npm install`
- Dev server: `npm run dev`
- Type check: `npm run typecheck`
- Tests: `npm test`
- Requirements suite: `npm run test:requirements`

## Environment Setup

- Copy values from [.env.example](.env.example).
- Required for DB work: `DATABASE_URL`
- Required for AI path: `GEMINI_API_KEY`
- Main runtime defaults are defined in [src/config/env.ts](src/config/env.ts).

## Architecture Map

- App entry and error envelope setup: [src/app.ts](src/app.ts)
- Server bootstrap: [src/index.ts](src/index.ts)
- Feature modules live in [src/modules](src/modules):
  - `emotion`, `sos`, `game`, `orchestration`, `session`, `health`
- Shared utilities and contracts:
  - HTTP envelope: [src/shared/http/response.ts](src/shared/http/response.ts)
  - Error model: [src/shared/http/errors.ts](src/shared/http/errors.ts)
  - Safety text filtering: [src/shared/safety/content-filter.ts](src/shared/safety/content-filter.ts)
- Gemini integration:
  - Client: [src/integrations/gemini/gemini.client.ts](src/integrations/gemini/gemini.client.ts)
  - Prompts: [src/integrations/gemini/gemini.prompts.ts](src/integrations/gemini/gemini.prompts.ts)

## Coding Conventions

- Keep module structure consistent: `*.routes.ts`, `*.schema.ts`, `*.service.ts`, `*.repository.ts`, `*.types.ts`.
- Route handlers should return `ok(...)` and let central error handling format failures.
- Validate request data with Elysia `t.Object(...)` schemas in `*.schema.ts`.
- For device-bound flows, resolve identity via [src/modules/session/session.service.ts](src/modules/session/session.service.ts) instead of duplicating user lookup logic.
- Keep user-facing AI text in Vietnamese with diacritics, consistent with [src/integrations/gemini/gemini.prompts.ts](src/integrations/gemini/gemini.prompts.ts).

## Database And Prisma

- Schema source of truth: [prisma/schema.prisma](prisma/schema.prisma)
- Prisma client singleton: [src/config/db.ts](src/config/db.ts)
- Common workflow:
  - `npm run prisma:migrate`
  - `npm run prisma:generate`
  - `npm run prisma:seed`
- Do not edit generated Prisma client files under `node_modules/`.

## Testing Guidance

- Test framework: Bun test (`npm test`).
- Test files are in [tests](tests).
- Integration requirements tests in [tests/requirements.test.ts](tests/requirements.test.ts) are skipped when `DATABASE_URL` is missing.
- Gemini format contract tests are in [tests/gemini-format.test.ts](tests/gemini-format.test.ts).

## Known Pitfalls

- Running commands outside `safemind-backend/` can create incorrect dependency state.
- Missing env vars cause non-obvious failures:
  - No `DATABASE_URL` -> DB-backed tests and data flows fail or skip.
  - No `GEMINI_API_KEY` -> AI path falls back to non-AI behavior.
- Keep changes to generated or lock files intentional and reviewable.

## Reference Docs

- High-level feature spec: [prompt.md](prompt.md)
- Base project README: [README.md](README.md)