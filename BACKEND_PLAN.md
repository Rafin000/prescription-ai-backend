# Prescription AI — Backend Plan (NestJS, ff-be style, small-team-forever)

A single NestJS API (`prescription-ai-backend`) serving both Vite SPAs
(dashboard + landing). Mirroring Forward Flow's ff-be patterns, with
production-pressure and small-team discipline baked into the baseline.

**Hard constraint**: the team is and will remain small. Every choice has to
survive the "one engineer at 2am" test: can they understand, debug, and fix
it alone? That rules out microservices, self-hosted infra, exotic tech, and
"we'll add it later" retrofits on hot tables.

---

## 1. Architecture at a glance

```
                 Cloudflare  (DNS, WAF, DDoS, bot rules)
                        │
          ┌─────────────┼───────────────┐
          ▼             ▼               ▼
    /public/*       /app/* (auth)   /api/*
    s-maxage=60
          │             │               │
┌─────────────────────────────────────────────────────┐
│       prescription-ai-backend  (NestJS 10)          │
│                                                     │
│   Controllers → Services → Repositories → PgBouncer │
│   (HTTP)        (domain)    (CLS PoolClient)        │
│                                                     │
│   WS Gateways  ─► Redis pub/sub  ─► other replicas  │
│   BullMQ Queues  ─► Redis        ─► worker process  │
│   Consult streaming plane  (Redis-backed state)     │
└────────┬────────────────────┬───────────────────────┘
         │                    │
         ▼                    ▼
  Managed Postgres       Managed Redis
  (+ pg_trgm,            (queues + pub/sub +
   tsvector,              short-lived state)
   partitioning)
         │
         ▼
   S3  ◄── workers ─► SSLCommerz / SMS / Anthropic / OpenAI /
                       Deepgram / Resend / Daily.co
```

### Why not microservices, ever (for this team)

Every service doubles alerts, logs, deploys, and on-call surface. Small
team can't afford it. **Modular monolith** — each domain is a Nest module,
cross-module calls go through the other module's service, never its repo.

Extraction is an ejection seat, not a plan. We design for it (stateless
gateways, Redis pub/sub, interface-based integrations), but we only
extract a module when a specific load signal forces us to.

### Two processes, one repo, one image

- `main.ts` — HTTP + WS gateways (`yarn start:prod`).
- `main.worker.ts` — BullMQ processors + `@nestjs/schedule` crons (`yarn worker`).

Deployed as two Kubernetes/Fargate/Fly Deployments from the same image.
Cron lives in one replica of the worker so scheduled producers don't
double-fire.

---

## 2. Project layout

Three projects side-by-side in `Prescription AI/`:

```
Prescription AI/
├── prescription-ai-landing/        # Vite SPA  (unchanged)
├── prescription-ai-dashboard/      # Vite SPA  (unchanged)
└── prescription-ai-backend/        # ← NestJS 10, ff-be style
    ├── Dockerfile
    ├── nest-cli.json
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.build.json
    ├── docker-compose.yml          # postgres, redis, pgbouncer (dev)
    └── src/
        ├── main.ts                 # HTTP + WS
        ├── main.worker.ts          # BullMQ + cron
        ├── app.module.ts
        │
        ├── _migrations/            # node-pg-migrate, timestamped .sql
        │   ├── 1737000000000_extensions.sql
        │   ├── 1737000100000_users_teams.sql
        │   ├── 1737000200000_doctors_chambers.sql
        │   ├── 1737000300000_patients_pii.sql
        │   ├── 1737000400000_appointments.sql
        │   ├── 1737000500000_consults_partitioned.sql
        │   ├── 1737000600000_prescriptions.sql
        │   ├── 1737000700000_billing_usage.sql
        │   ├── 1737000800000_onboarding.sql
        │   ├── 1737000900000_video_rooms.sql
        │   ├── 1737001000000_notifications_partitioned.sql
        │   ├── 1737001100000_audit_log_partitioned.sql
        │   ├── 1737001200000_feature_flags.sql
        │   └── 1737001300000_indexes_fks.sql
        │
        ├── base/
        │   ├── base.constants.ts       # CLS keys, enums
        │   ├── base.repository.ts      # getClient() from CLS
        │   └── base.transformer.ts     # row → resource
        │
        ├── config/                     # @nestjs/config + env schema
        ├── decorators/                 # @CurrentUser @TeamId @Roles @Public
        ├── filters/                    # http-exception.filter.ts
        ├── guards/                     # jwt  team  roles
        ├── interceptors/
        │   ├── pool-client.interceptor.ts   # BEGIN/COMMIT + CLS
        │   ├── request-id.interceptor.ts    # correlation id into pino
        │   ├── audit.interceptor.ts         # writes audit_log rows
        │   └── transform.interceptor.ts
        ├── shared/
        │   └── utils/                   # pagination, hash, ids
        │
        ├── modules/
        │   ├── database/                # pg.Pool provider, partition cron
        │   ├── logger/                  # nestjs-pino + request id
        │   ├── feature-flags/
        │   ├── auth/
        │   ├── doctors/                 # directory + signed-up profile
        │   ├── chambers/
        │   ├── patients/
        │   │   ├── patients.repository.ts
        │   │   └── pii.repository.ts    # separate table, encrypted
        │   ├── appointments/
        │   ├── consults/
        │   │   ├── consults.controller.ts
        │   │   ├── consults.module.ts
        │   │   ├── consults.repository.ts
        │   │   ├── consults.service.ts
        │   │   ├── transcription-sink.service.ts   # transcript frames in
        │   │   ├── draft-stream.service.ts         # LLM streaming + WS fan-out
        │   │   ├── consults.gateway.ts             # socket.io room
        │   │   ├── dtos/ queries/ transformers/ types/
        │   ├── prescriptions/
        │   ├── billing/
        │   ├── usage/                   # cost_events, daily rollups
        │   ├── team/
        │   ├── onboarding/
        │   ├── video/
        │   ├── notifications/
        │   ├── audit/
        │   ├── retention/               # cold-archive workers, partition cron
        │   ├── admin/                   # thin CRUD for /admin/cost etc.
        │   └── public/
        │
        ├── queues/                      # BullMQ
        │   ├── queues.module.ts
        │   ├── ai-drafting.processor.ts
        │   ├── sms.processor.ts
        │   ├── pdf.processor.ts
        │   ├── invoice.processor.ts
        │   ├── notification.processor.ts
        │   ├── retention.processor.ts
        │   └── partition.processor.ts   # monthly ensureNextPartition
        │
        ├── integrations/                # swappable SDK wrappers
        │   ├── sslcommerz/
        │   ├── sms/                     # SSL Wireless / Alpha-SMS
        │   ├── email/                   # Resend
        │   ├── s3/
        │   ├── video/                   # Daily.co / LiveKit
        │   ├── geocode/                 # Nominatim
        │   └── ai/
        │       ├── ai-draft.provider.ts        # interface
        │       ├── anthropic.provider.ts
        │       ├── openai.provider.ts
        │       └── stt-token.service.ts        # mint short-lived STT tokens
        │
        └── scripts/
            ├── migrate.ts               # wraps node-pg-migrate
            ├── seed.ts
            └── check-env.ts
```

Frontends stay on Vite. Each existing `services/*.ts` in the SPAs flips to
real URLs as its slice lands behind a `VITE_USE_MOCKS` flag — no big-bang
cutover.

---

## 3. Data layer

### 3.1 The JSONB rule (ff-be style, load-bearing)

**Promote a field to a column only if one of the following is true:**

1. It's used in `WHERE`, `JOIN`, `ORDER BY`, or `GROUP BY`.
2. It's indexed or part of a unique constraint.
3. It's a foreign key.
4. It's needed on **every** read of the row (`id`, `team_id`, `created_at`,
   `status`).
5. It's the tenancy / ownership scope (`team_id`, `doctor_id`, `user_id`).

**Everything else — free-text, arrays, option objects, provider metadata,
UI hints, denormalised caches, future-unknowns — lives in a single `data
jsonb NOT NULL DEFAULT '{}'::jsonb` column on the row.**

This is the pattern ff-be uses on `active_lead_sources.data` and nearly
every other table. Benefits for us:

- **Schema evolution without migrations.** Adding a new Rx field =
  transformer change, not a migration on a hot table.
- **Fewer locks, fewer risky deploys.** Hot tables stay narrow.
- **Clear query discipline.** If you want to filter by a field, you
  promote it to a column — and while promoting, you remember to index it.

Mutations use the ff-be idioms:

```sql
-- shallow merge
UPDATE doctors
SET data = data || $2::jsonb, updated_at = now()
WHERE id = $1;

-- set a nested path
UPDATE doctors
SET data = jsonb_set(data, '{bio}', to_jsonb($2::text))
WHERE id = $1;

-- append to an array
UPDATE doctors
SET data = jsonb_set(
  data, '{focus_areas}',
  coalesce(data->'focus_areas', '[]'::jsonb) || jsonb_build_array($2::text)
)
WHERE id = $1;
```

**Transformers** are where jsonb earns its keep. Each module's transformer
knows the shape of its `data` blob and emits a camelCase resource:

```ts
export const doctorResource = new Transformer<DoctorRow, DoctorResource>()
  .from(row => ({
    id: row.id,
    teamId: row.team_id,
    specialty: row.specialty,
    rating: row.rating,
    status: row.status,
    // everything below comes from jsonb
    degrees: row.data.degrees ?? [],
    focusAreas: row.data.focus_areas ?? [],
    tagline: row.data.tagline ?? null,
    feeBdtDefault: row.data.fee_bdt_default ?? null,
    avatarUrl: row.data.avatar_url ?? null,
    languages: row.data.languages ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
```

Reverse transformers shape DTOs → `jsonb` payloads for writes (the same
pattern ff-be uses — `reverseAiAssistantResource`).

**Guardrails for the jsonb rule:**

- **Never filter in WHERE on jsonb fields.** If you find yourself writing
  `WHERE data->>'status' = 'active'`, promote `status` to a column in the
  next migration.
- **Never sort large result sets by a jsonb field.** Same remedy.
- **If a field is used in three or more queries, promote it** — even if
  each query is small.
- **Add a GIN index on `data`** only on the rare tables where we do need
  occasional jsonb containment queries.

### 3.2 CLS-scoped `PoolClient` (the ff-be core trick)

One `pg.Pool` per app. A global `PoolClientInterceptor` checks out one
client per request, stashes it in `nestjs-cls`, wraps `BEGIN/COMMIT`, and
releases on finish. Every repo reads the client back out of CLS —
so multi-repo writes in one request are automatically transactional with
zero plumbing.

```ts
// base/base.repository.ts
export class BaseRepository {
  constructor(private cls: ClsService, private db: DatabaseService) {}
  protected async getClient(): Promise<PoolClient> {
    const c = this.cls.get<PoolClient>(CLS_POOL_CLIENT);
    if (!c) throw new Error('No pg client in request context');
    return c;
  }
}
```

### 3.3 Repository shape

```ts
@Injectable()
export class DoctorsRepository extends BaseRepository {
  private readonly FIND_BY_SPECIALTY_QUERY: string;

  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
    this.FIND_BY_SPECIALTY_QUERY = readFileSync(
      join(__dirname, './queries/find-by-specialty.sql'), 'utf-8'
    );
  }

  async findBySpecialty(teamId: string, filter: FilterDoctorsDto) {
    const client = await this.getClient();
    const result = await client.query(this.FIND_BY_SPECIALTY_QUERY, [
      teamId, filter.specialty, filter.area ?? null, filter.limit, filter.offset,
    ]);
    return doctorCollection.transformCollection(result.rows);
  }

  async updateProfileMeta(teamId: string, doctorId: string, patch: Record<string, unknown>) {
    const client = await this.getClient();
    await client.query(
      `UPDATE doctors SET data = data || $3::jsonb, updated_at = now()
       WHERE id = $1 AND team_id = $2`,
      [doctorId, teamId, JSON.stringify(patch)],
    );
  }
}
```

Rules:

- **SQL >5 lines** → `queries/*.sql`, loaded via `readFileSync` in the ctor.
- **SQL ≤5 lines** → inline.
- **First param is always the tenant scope.** Multi-tenancy enforced here,
  never in the controller.
- **Repos throw `NotFoundException` / `BadRequestException`** directly
  (ff-be style) — service doesn't wrap-and-rethrow trivially.

### 3.4 Migrations — `node-pg-migrate`

```json
"migrate:up":        "node-pg-migrate up -m ./src/_migrations",
"migrate:down:step": "node-pg-migrate down 1 -m ./src/_migrations",
"migrate:create":    "node-pg-migrate create -m ./src/_migrations --migration-filename-format timestamp --migration-file-language sql"
```

- Forward-only. Risky changes → expand/migrate/contract across deploys.
- **Online-migration discipline.** No single migration may lock a hot
  table (`appointments`, `consults`, `transcripts`, `audit_log`,
  `notifications`) for >1s. Adding a non-null column: add nullable →
  dual-write → backfill in batches of 1000 via a BullMQ job →
  `SET NOT NULL`.
- Dev: `AppModule.onApplicationBootstrap` runs `migrate:up` when
  `NODE_ENV !== 'production'`. Prod: release job runs it **before** web
  takes traffic.

### 3.5 Partitioning & retention

Partition from day one on every append-heavy table:

- `consult_events`, `transcripts`, `notifications`, `audit_log`,
  `usage_events`, `cost_events` — **monthly partitions** (Postgres
  declarative partitioning, `PARTITION BY RANGE (created_at)`).
- A BullMQ cron runs `partition.processor.ts` on the 25th of each month to
  create the next month's partition.
- **Retention jobs** (`retention.processor.ts`):
  - Transcripts older than 180 days → S3 JSONL archive + delete row.
  - Old notifications → S3 archive + delete.
  - Audit log stays in DB ≥ 7 years (regulatory safety), then archive.

### 3.6 Schema sketch (promoted columns only; everything else in `data` jsonb)

```
users(id, email UNIQUE, password_hash?, created_at)
  data: { name, phone, avatar_url, locale, … }

teams(id, plan, status, created_at)
  data: { name, billing_email, address, logo_url, … }

team_members(id, team_id, user_id, role, status, created_at)
  data: { invited_by, last_active_at, … }

doctors(id, team_id, user_id, specialty, rating, status, created_at, updated_at)
  data: { degrees, focus_areas, tagline, bio, fee_bdt_default,
          languages, avatar_url, social, … }

chambers(id, team_id, doctor_id, lat, lng, area, status, created_at)
  data: { name, address, phone, hours, photos, amenities, … }

patients(id, team_id, doctor_id, created_at, updated_at, anonymised_at?)
  data: { dob, gender, allergies_summary, notes, … }

patient_pii(patient_id PK, team_id, encrypted_blob jsonb)   -- separate table
  -- { name, phones, addresses, emergency_contact, id_no } encrypted at app layer

appointments(id, team_id, doctor_id, patient_id, chamber_id, slot_start,
             slot_end, status, created_at)
  data: { notes, reschedule_history, source, payment_status, … }

appointment_requests(id, doctor_id, chamber_id?, status, phone, created_at)
  data: { patient_name, symptoms, preferred_time, otp_attempts, … }

consults(id, team_id, doctor_id, patient_id, appointment_id?, mode, status,
         started_at, ended_at)
  data: { pause_reasons, codes, pre_visit_notes, … }

consult_events(id, consult_id, team_id, kind, created_at)   -- PARTITIONED
  data: { payload… }

transcripts(id, consult_id, team_id, speaker, ts, text, created_at)  -- PARTITIONED
  data: { confidence, words[], provider, … }

prescriptions(id, consult_id, patient_id, team_id, doctor_id, status,
              model_id, prompt_version, finalised_at?, created_at)
  data: { chief_complaints, diagnoses, medicines[], tests[], advice[],
          operation, vitals, follow_up, … }

surgical_plans(id, prescription_id, patient_id, team_id, scheduled_for, status, created_at)
  data: { procedure, facility, prep_notes, cost_estimate_bdt, … }

subscriptions(id, team_id, plan_id, status, current_period_end, created_at)
  data: { sslcommerz_refs, trial_ends_at, cancel_at, … }

invoices(id, team_id, period_start, period_end, amount_bdt, status,
         sslcommerz_tran_id UNIQUE?, created_at)
  data: { line_items, breakdowns, pdf_s3_key, issued_at, … }

usage_events(id, team_id, consult_id?, kind, quantity, cost_bdt, ts,
             idempotency_key UNIQUE)   -- PARTITIONED
  data: { provider, model, request_id, raw_meta, … }

cost_events(id, team_id, category, amount_bdt, ts)           -- PARTITIONED
  data: { source_event_id, provider, … }

notifications(id, team_id, kind, channel, recipient, status,
              dedupe_key UNIQUE, ts)                         -- PARTITIONED
  data: { template_vars, provider_response, retry_history, … }

onboarding_progress(id, team_id, step, completed_at?)
  data: { payload_snapshot, … }

invites(id, team_id, email, role, token UNIQUE, expires_at, status, created_at)
  data: { invited_by, message, … }

video_rooms(id, consult_id UNIQUE, provider, external_id, status, created_at)
  data: { tokens_issued, presence_snapshot, … }

audit_log(id, team_id, actor_user_id, resource_type, resource_id,
          action, ts, prev_hash, ip)                         -- PARTITIONED
  data: { diff, metadata, user_agent, … }

feature_flags(key PK, team_id? NULL, rolled_out_pct, updated_at)
  data: { value, description, … }
```

Every one of those `data` jsonb blobs can grow new fields without a
migration. Promotion happens only when query pressure demands it.

### 3.7 Connection pooling

**PgBouncer (or the managed equivalent) in transaction-pool mode, from
day one.** `pg.Pool(size=10)` per Nest instance × N instances wouldn't
fit Postgres's connection cap by replica-count 6. PgBouncer fronts that.

Caveats we design around:
- Transaction-pool mode forbids session-level features (`LISTEN`, temp
  tables scoped to a session, prepared statements on server side). Our
  repositories already don't use these.
- Statement timeouts set at app connect.

### 3.8 Idempotency as a column convention

Every table that receives an external event has an `idempotency_key text
UNIQUE` column we own (not the vendor's):

- `invoices.sslcommerz_tran_id`
- `usage_events.idempotency_key`
- `notifications.dedupe_key`
- `appointment_requests.client_nonce`
- LLM draft jobs keyed by `consult_id` so a retried finalize can't produce
  two drafts.

### 3.9 Patient PII split (day-one right-to-be-forgotten)

`patients` holds non-PII clinical/operational fields. `patient_pii` holds
encrypted jsonb blob of PII (`name`, `phones`, `addresses`, `id_no`,
emergency contact). Anonymisation = single `DELETE FROM patient_pii
WHERE patient_id = $1` + `UPDATE patients SET anonymised_at = now()`. No
cascading headaches.

### 3.10 Audit log

Append-only `audit_log` (partitioned monthly). Written by a global
`AuditInterceptor` for every mutating route and every prescription read.
`prev_hash` column chains rows — tamper-evident without a full ledger.

---

## 4. Request lifecycle

```
Vite SPA
   │  axios → https://api.prescription.ai/…   (JWT in HTTP-only cookie)
   ▼
Cloudflare  →  ALB  →  Nest HTTP
   │
   ▼
RequestIdInterceptor → JwtGuard → TeamGuard → RolesGuard
   → PoolClientInterceptor(BEGIN) → AuditInterceptor
   → Controller → Service → Repository
   → Transformer(row → resource) → (COMMIT/ROLLBACK)
```

- **Controllers** ≤ 20 LoC. Parse, delegate, return.
- **Services** — `@Injectable()`, business rules only. Never HTTP, never SQL.
- **Repositories** — one method per query, first arg tenant scope,
  jsonb-aware.
- **DTOs** — `class-validator` + `class-transformer`. Global
  `ValidationPipe({ whitelist: true, transform: true })`.

---

## 5. Realtime & the consult streaming plane

BullMQ is for tail work (PDF, SMS, invoice). The consult pipeline is a
**streaming plane**, distinct from the job queue.

### 5.1 STT: browser → provider direct

Audio never touches our backend. Browser streams directly to Deepgram /
Whisper-realtime using a **short-lived token minted by
`stt-token.service.ts`**. Transcript frames flow back to us over the
browser's WS and we persist + rebroadcast. Saves bandwidth, eliminates a
whole class of back-pressure bugs, keeps our servers stateless-per-request.

### 5.2 LLM drafting as an owned stream

Doctor hits finalize → `DraftStreamService` opens an Anthropic stream in a
Nest service, tokens fan out over socket.io to a `consult:<id>` room,
running state is mirrored to Redis (`consult:<id>:draft`). Final tokens
persisted to `prescriptions.data`. A browser refresh re-joins the room and
replays from Redis — the stream is not tied to the doctor's HTTP session.

### 5.3 WS isolation rules

So we can extract a `realtime` deploy later without rewriting:

- Gateway handlers do **no DB work**. Only Redis pub/sub + enqueue jobs.
- Socket.io Redis adapter from day one — no sticky sessions, free
  horizontal scale.
- Gateways live in their module's folder but only depend on Redis +
  service interfaces, never a repo.

### 5.4 Graceful shutdown

`main.ts` and `main.worker.ts` both:

- Handle `SIGTERM` cleanly.
- Drain HTTP (30s).
- Wait for in-flight BullMQ jobs up to N seconds, then DLQ the rest.
- Close Redis + PG pools.
- SPAs auto-reconnect WS with exponential backoff.

Deploys set `maxSurge=1, maxUnavailable=0` on `web`.

---

## 6. Async work (BullMQ)

| Queue                   | Producer                            | Processor              | Why async           |
| ----------------------- | ----------------------------------- | ---------------------- | ------------------- |
| `pdf:render`            | Rx save & print                     | pdf                    | 1–3s render         |
| `sms:send`              | appointment confirm / reminders     | sms                    | 3rd-party provider  |
| `invoice:generate`      | monthly `@Cron`                     | invoice                | PDF + email         |
| `usage:rollup`          | hourly `@Cron`                      | usage                  | aggregate ledger    |
| `cost:rollup`           | daily `@Cron`                       | usage                  | per-team cost totals |
| `notification:dispatch` | all domain events                   | notification           | templating + fan-out |
| `retention:archive`     | weekly `@Cron`                      | retention              | transcripts → S3    |
| `partition:ensure`      | 25th-of-month `@Cron`               | partition              | next-month partitions |

- One worker image, one worker deployment, **queues isolated by BullMQ
  concurrency limits** so a stuck provider doesn't starve other queues.
- One cron replica so scheduled producers don't double-fire.
- Split a queue to its own worker repo only if a specific queue
  demonstrably needs different scaling — not before.

---

## 7. Auth & authorisation

- **`@nestjs/passport` + `@nestjs/jwt`**, JWT in an HTTP-only, Secure,
  SameSite=Lax cookie on a shared apex domain. No tokens in localStorage.
- **Session payload**: `{ sub: userId, teamId, role, onboardingComplete }`.
- **Guards** (global, opt-out with `@Public()`): `JwtGuard`, `TeamGuard`,
  `RolesGuard` (owner / doctor / assistant / receptionist).
- **Email+password** for doctors (`bcryptjs`). **Magic-link** for invited
  team members (`invites.token`, short-lived, single-use). **Phone OTP**
  on `appointment_requests` — no account required for the patient at MVP.
- **Rate limiting** (`@nestjs/throttler`) on:
  `/public/appointment-requests` (per IP + per phone),
  `/public/symptom-suggest` (LLM cost protection),
  `/public/demo-bookings`, `/auth/login`, `/auth/signup`. Cloudflare bot
  rules on top.

---

## 8. External integrations

| Concern      | Provider                                | Lives in                  |
| ------------ | --------------------------------------- | ------------------------- |
| Payments     | **SSLCommerz** hosted checkout + IPN    | `integrations/sslcommerz` |
| SMS (BD)     | SSL Wireless / Alpha-SMS                | `integrations/sms`        |
| Email        | Resend                                  | `integrations/email`      |
| Video        | Daily.co / LiveKit Cloud                | `integrations/video`      |
| LLM          | Anthropic primary, OpenAI fallback      | `integrations/ai`         |
| STT          | Deepgram / Whisper realtime             | `integrations/ai`         |
| File storage | S3 (+ presigned URLs, versioned bucket) | `integrations/s3`         |
| Geocode      | Nominatim on chamber save               | `integrations/geocode`    |

Each behind an interface. `AIDraftProvider` in particular is
runtime-swappable per tenant via `feature_flags` so we can move traffic
between models without deploy.

---

## 9. Observability (day one, non-negotiable)

- **Structured logs**: `nestjs-pino` + `nestjs-cls` threading a request
  ID from interceptor → service → repo → queue processor. One log stream
  to grep.
- **Error tracking**: Sentry on both SPAs + backend.
- **Metrics**: Prometheus-style, scraped by the platform. Core ones:
  - request latency p50/p95/p99 per route
  - BullMQ queue depth, job duration, failure rate per queue
  - `pg.Pool` saturation, PgBouncer in-use
  - socket.io connected sessions
  - per-integration latency + error rate
- **Symptom-based alerts, not cause-based.** "Appointment-request p95 >
  2s for 5m" not "CPU > 70%". Cuts pager noise ~10×.
- **No OpenTelemetry traces** until we've felt the need. Logs + metrics
  cover ~90% of prod investigations.

---

## 10. Validation, errors, transformers

- `class-validator` + `class-transformer` on DTOs.
- Global exception filter → `{ error, code, requestId, details? }`.
- Repositories throw `NotFoundException` / `BadRequestException`
  directly.
- Transformers (`base.transformer.ts`) convert snake_case rows (incl.
  jsonb) → camelCase resources; reverse transformers shape DTOs into
  jsonb payloads for writes.
- Shared types for frontends: exported into a `@pai/types` workspace
  package the two Vite SPAs depend on. No generated OpenAPI client until
  we need it.

---

## 11. Environments & deployment

- **Dev**: `docker-compose up` (postgres + redis + pgbouncer).
  `yarn start:dev` in backend.
- **Staging / Prod**: one Docker image, deployed as two Deployments —
  - `web` (Nest HTTP + WS) — N replicas, rolling.
  - `worker` (`main.worker.ts`) — M replicas + 1 cron replica.
  - **Managed multi-AZ Postgres** (Neon / Supabase / RDS), **managed
    Redis** (Upstash / Elasticache).
  - **Cloudflare** in front of everything (DNS, WAF, bot rules, CDN).
  - **S3 versioned bucket** for Rx PDFs and transcript archives.
- **Release**: `migrate:up` job → green → `web` + `worker` roll out.
- **Config**: `@nestjs/config`, env in dev, platform secret store in prod.
- **Backups**: PITR 7 days on Postgres, nightly snapshot kept 90 days,
  weekly `pg_dump` to a cold bucket kept 1 year. **Quarterly restore
  drill** or backups don't exist.
- **pg_stat_statements + slow query log on.** Find the N+1 before the
  user does.

---

## 12. Small-team operating discipline (baked in)

- **Managed everything.** Postgres, Redis, S3, email, SMS, Sentry,
  Cloudflare. No self-hosted databases, ever.
- **One backend repo, one image.** Workers are an entrypoint, not a repo.
- **Retool for internal admin**, PostHog for analytics, Intercom/Chatwoot
  for support, Instatus for status. Not DIY.
- **Feature flags**: tiny in-house table + service. Skip LaunchDarkly.
- **Cost observability**: `cost_events` ledger + daily per-team rollup +
  one `/admin/cost` view. Budget alerts + graceful AI fallback baked in
  (when a team hits hard cap, AI drafting stops; manual Rx keeps
  working).
- **Deploy discipline**: zero-downtime rolling, `maxSurge=1,
  maxUnavailable=0` on `web`; graceful shutdown; no risky migrations
  during BD clinic hours (4–10pm).
- **No "we'll add it later"** for: partitioning, audit log, PII split,
  idempotency keys, structured logs, Sentry, rate limits, graceful
  shutdown, backups, retention. All day-one.

---

## 13. Order of implementation

1. **Skeleton** — Nest app, docker-compose (postgres + pgbouncer + redis),
   `DatabaseModule`, `BaseRepository`, `PoolClientInterceptor`,
   `RequestIdInterceptor`, `AuditInterceptor` scaffolded empty,
   `node-pg-migrate` wired, pino + Sentry + `@Public() GET /health`.
2. **Extensions + feature flags + audit log + partitions infra** — one
   migration round to lay the foundation.
3. **Public directory** — `DoctorsModule` + `ChambersModule` +
   `AppointmentRequestsModule`. Flip the landing's `landingService.ts` to
   real URLs. First real traffic.
4. **Auth + onboarding** — signup, JWT cookie, onboarding steps, team
   member invites skeleton.
5. **Patient + patient PII split + appointment** — scheduling loop, phone
   OTP for patient-side confirmation.
6. **Consult + prescription + streaming plane** — sessions, transcript
   sink, draft stream service, ai-drafting processor, pdf processor.
7. **Billing + usage + cost events + SSLCommerz IPN** — invoices,
   subscription, per-team caps, `/admin/cost`.
8. **Video** — tokens, presence gateway, lobby.
9. **Notifications** — SMS/email fan-out hooked into domain events.
10. **Retention + admin tooling hookup (Retool)** + rate limits + the
    `@pai/types` package published for the SPAs.

---

## 14. Key decisions, restated

- **NestJS monolith**, ff-be style. No microservices — design for
  extraction, don't extract prospectively.
- **JSONB for everything not queried.** Only promote to column when
  WHERE/JOIN/ORDER/unique/FK/always-read demands it.
- **CLS-scoped `PoolClient`** for zero-plumbing per-request
  transactions.
- **PgBouncer** (transaction-pool) from day one.
- **Partitioned hot tables** (`transcripts`, `audit_log`, `notifications`,
  etc.) from day one. Retention jobs scheduled even while empty.
- **Patient PII in a separate table.** Anonymisation = one DELETE.
- **Idempotency keys** as a column convention on anything external.
- **Cost events + per-team budgets** in the data model from day one.
- **Audit log append-only + hash-chained.**
- **Streaming plane ≠ queue.** STT and LLM drafting stream via
  Redis-backed state + WS; BullMQ is only for tail work.
- **WS isolation rules** so extracting `realtime` is a deploy split, not
  a rewrite.
- **Managed everything**, Cloudflare in front, pino + Sentry + metrics
  from day one.
- **Multi-tenancy via `team_id`** on every tenanted table, enforced at
  the repository.
- **SSLCommerz** for payments. **Daily.co / LiveKit** for video.
- **`pg_trgm` + `tsvector`** for directory search. pgvector only when
  we have a real semantic-retrieval case.
