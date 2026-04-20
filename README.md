# prescription-ai-backend

NestJS API for Prescription AI. Serves both Vite SPAs (`prescription-ai-landing`
and `prescription-ai-dashboard`) over HTTPS with a JWT cookie.

See [`../BACKEND_PLAN.md`](../BACKEND_PLAN.md) for the full architecture and
the rules everything is built on (ff-be style, CLS-scoped PoolClient, JSONB
rule, partitioned hot tables, idempotency, audit log, small-team discipline).

## Quick start

```bash
# infra (postgres, pgbouncer, redis)
docker compose up -d

# deps
yarn install
cp .env.example .env

# migrations + dev server
yarn migrate:up
yarn start:dev
```

Verify:

```bash
curl http://localhost:4000/health
# {"status":"ok","service":"prescription-ai-backend","db":"ok"}
```

## Scripts

| command                  | what                                                  |
| ------------------------ | ----------------------------------------------------- |
| `yarn start:dev`         | HTTP + WS with hot reload                             |
| `yarn worker:dev`        | BullMQ workers + cron with hot reload                 |
| `yarn start:prod`        | production HTTP (Docker image CMD)                    |
| `yarn worker`            | production worker                                     |
| `yarn migrate:up`        | apply pending migrations via `node-pg-migrate`        |
| `yarn migrate:down:step` | revert exactly one migration                          |
| `yarn migrate:create`    | generate a new timestamped SQL migration              |

## Layout

```
src/
├── _migrations/            numbered .sql files, forward-only
├── base/                   BaseRepository, Transformer, shared constants
├── config/                 env schema validated with class-validator
├── decorators/             @Public @CurrentUser @TeamId @Roles
├── guards/                 JwtGuard (global), RolesGuard
├── interceptors/           PoolClientInterceptor (BEGIN/COMMIT per request)
├── filters/                HttpExceptionFilter → { error, code, requestId }
├── modules/
│   ├── database/           pg.Pool + onModuleInit health probe
│   ├── logger/             nestjs-pino + CLS request id
│   └── health/             GET /health
├── scripts/migrate.ts      wraps node-pg-migrate for CI / bootstrap
├── shared/utils/
├── app.module.ts           wires config, CLS, guards, filter, interceptor
├── main.ts                 HTTP entrypoint
└── main.worker.ts          BullMQ entrypoint (same module graph, no HTTP)
```

## Ports in dev

| service     | port  | notes                                            |
| ----------- | ----- | ------------------------------------------------ |
| API         | 4000  | Nest HTTP                                        |
| Postgres    | 5434  | direct, for `migrate:up` and ad-hoc psql         |
| PgBouncer   | 6432  | transaction-pool, what the app connects through  |
| Redis       | 6380  | queues + socket.io pub/sub                       |

## Adding a domain module (ff-be style)

```
src/modules/doctors/
├── doctors.controller.ts
├── doctors.module.ts
├── doctors.service.ts
├── doctors.repository.ts          extends BaseRepository
├── queries/*.sql                  loaded via readFileSync in the ctor
├── dtos/*.dto.ts                  class-validator
├── transformers/*.resource.ts     row → camelCase resource (+ reverse)
└── types/*.model.ts               TS-only shape of the row
```

Hard rules:

- Promote a jsonb field to a column **only** when it's queried, indexed,
  FK'd, always-read, or the tenancy scope. Otherwise it stays in `data jsonb`.
- First param of every repo method is the tenant scope (`teamId` / `doctorId`).
- SQL > 5 lines → `queries/*.sql`. SQL ≤ 5 lines → inline.
- No cross-module repo imports. Go through the other module's service.

## What's not here yet

Per the implementation order in `BACKEND_PLAN.md`, the skeleton ends here:
step 1 (skeleton) + step 2 (foundation migrations). The next slice is the
public directory (`DoctorsModule` + `ChambersModule` + appointment requests),
which unblocks the landing site end-to-end.
