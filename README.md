# MailTrace DX Lab

> **Developer-facing email lifecycle observability in Next.js + strict TypeScript.**

MailTrace DX Lab is a self-directed engineering sample for debugging a simulated outbound message across **request IDs, message IDs, signed webhook events, retries, idempotency, event ordering, raw payloads, and deterministic SPF/DKIM/DMARC diagnostics**.

The product is intentionally narrow: a reviewer can create one trace, generate or send signed lifecycle events, inspect exactly what happened, replay an event, and see why a domain fixture is healthy or broken.

**Evidence boundary:** this lab **does not send real email**, **does not query live DNS**, does not use customer data, and is **not affiliated with Resend**. It demonstrates product/engineering decisions; it does not manufacture production credentials.

## Why this project exists

Most webhook demos stop at “the endpoint returned 200.” MailTrace treats the debugging experience as the product:

- identifiers are visible instead of buried,
- signed events are verified against the exact raw body,
- stale timestamps are rejected inside a five-minute replay window,
- provider event IDs are idempotent,
- retries and arrival delay remain visible,
- late events do not silently regress the current lifecycle status,
- raw and normalized data can be inspected together,
- failures include a concrete next action,
- DNS behavior is deterministic and explicitly labeled as a fixture.

## Stack

- **Next.js 16** App Router
- **React 19**
- **TypeScript** with `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, and `noUnusedParameters`
- **Node route handlers**
- **SQLite** via Node's built-in `node:sqlite` API for this local sample
- **Zod** request validation
- **Vitest + React Testing Library**
- **Playwright** browser E2E
- **GitHub Actions**
- **pnpm**

The dependency surface is intentionally small. The local sample uses the Node SQLite API to keep persistence inspectable without introducing a separate ORM. A production system would revisit storage, migrations, concurrency, backups, and runtime support based on deployment requirements.

## System map

```text
Browser
  │
  ├── create trace
  ├── inspect current state + IDs
  ├── inspect event timeline / raw payload
  └── run deterministic domain fixture
  │
  ▼
Next.js route handlers (Node runtime)
  ├── POST /api/traces
  ├── GET  /api/traces
  ├── GET  /api/traces/:id
  ├── POST /api/webhooks/events
  ├── POST /api/diagnostics/domain
  └── POST /api/demo/events   (local/test only)
  │
  ▼
Application services
  ├── HMAC verification + replay window
  ├── event normalization
  ├── lifecycle precedence
  ├── idempotent event insertion
  ├── timeline reasoning
  └── deterministic domain diagnostics
  │
  ▼
SQLite
  ├── traces
  └── delivery_events (provider_event_id UNIQUE)
```

## Debugging flow

### 1. Create a trace

`POST /api/traces`

```json
{
  "recipient": "reviewer@example.com",
  "subject": "Observe this lifecycle"
}
```

The response exposes three different identifiers on purpose:

- `traceId` — product record
- `requestId` — API/request correlation
- `messageId` — lifecycle/webhook correlation

### 2. Send a signed webhook

`POST /api/webhooks/events`

Required headers:

```text
x-mailtrace-timestamp: <unix seconds>
x-mailtrace-signature: <HMAC-SHA256 hex digest>
```

Signature input:

```text
<timestamp>.<exact raw request body>
```

The server uses constant-time comparison and rejects timestamps outside the five-minute replay window.

Example body:

```json
{
  "providerEventId": "evt_demo_001",
  "messageId": "msg_...",
  "type": "delivered",
  "occurredAt": "2026-09-05T00:00:02.000Z",
  "retryAttempt": 0,
  "payload": {
    "source": "local-fixture"
  }
}
```

### 3. Inspect the timeline

The trace detail page shows:

- lifecycle timestamp,
- receipt timestamp,
- arrival delay,
- retry attempt,
- signature state,
- provider event ID,
- raw payload,
- an explicit out-of-order marker when receipt order disagrees with lifecycle order.

The trace's compact current status uses monotonic precedence, while the full event timeline remains the debugging source of truth.

### 4. Replay the same provider event

The `provider_event_id` column is unique. Replaying the event returns an idempotent duplicate result and does not create a second timeline event.

### 5. Run a deterministic domain diagnostic

The domain panel can reproduce:

- healthy records,
- missing SPF,
- invalid DKIM selector/key fixture,
- weak DMARC policy.

Every result shows the record, status, explanation, and next action. The interface states clearly that this is **not a live DNS lookup**.

## Error contract

Errors use one predictable shape:

```json
{
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Webhook signature could not be verified.",
    "nextAction": "Sign the exact raw request body with the configured local secret.",
    "requestId": "req_..."
  }
}
```

Implemented error classes include invalid requests, invalid signatures, stale webhooks, missing traces, oversized payloads, disabled demo endpoints, and unexpected server failures.

## Security and failure boundaries

The sample demonstrates:

- HMAC-SHA256 verification,
- constant-time signature comparison,
- five-minute replay tolerance,
- a 64 KiB webhook body limit,
- Zod validation before business logic,
- unique provider event IDs for idempotency,
- raw payload rendering through React text output rather than HTML injection,
- demo endpoint gating through an explicit environment variable,
- secrets in environment configuration only.

See [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) for the compact review model.

## Run locally

Prerequisites: Node 22+ and pnpm 10.4.1.

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Then open `http://localhost:3000`.

For the browser demo controls, explicitly set:

```text
MAILTRACE_ENABLE_DEMO_ENDPOINTS=true
```

Do not enable that route by default in a deployed environment.

## Verification

```bash
pnpm test:architecture
pnpm test:core
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify:public
pnpm test:e2e
```

The tests are intentionally layered:

| Layer | What it proves |
|---|---|
| Architecture checks | Required routes, strict compiler posture, evidence boundaries, accessible UI hooks |
| Core runtime tests | Status precedence, HMAC verification, replay window, SQLite idempotency, webhook service, out-of-order reasoning |
| Vitest unit/integration | Domain rules, persistence, service behavior, API contract |
| Component tests | Debugging state and accessible raw-payload disclosure |
| Playwright | Trace → signed event → duplicate replay → raw inspection → broken domain fixture |
| CI | Repeats the full install/lint/typecheck/test/build/E2E path on pull requests |

## Code review path

If you have five minutes:

1. [`lib/signatures.ts`](lib/signatures.ts) — signature and replay resistance.
2. [`lib/repository.ts`](lib/repository.ts) — SQLite schema + idempotent provider-event insert.
3. [`lib/webhook-service.ts`](lib/webhook-service.ts) — event-to-trace behavior and typed failure.
4. [`lib/timeline.ts`](lib/timeline.ts) — out-of-order arrival reasoning.
5. [`app/api/webhooks/events/route.ts`](app/api/webhooks/events/route.ts) — raw body limit, verification, validation, error contract.
6. [`components/event-timeline.tsx`](components/event-timeline.tsx) — product-facing observability.
7. [`e2e/trace-debugging.spec.ts`](e2e/trace-debugging.spec.ts) — end-to-end reviewer path.

For a longer walkthrough, read [`docs/CODE_TOUR.md`](docs/CODE_TOUR.md).

## Intentional non-goals

This repository does not claim:

- external email delivery,
- live DNS resolution,
- real users or customer data,
- multi-user authentication,
- background queues,
- managed infrastructure,
- external observability vendors,
- deliverability metrics,
- enterprise scale,
- security certification.

Those are production-design questions, not portfolio claims.

---

Built by **Amy Villa** as an inspectable Product Engineering / Developer Experience code sample.
