# MailTrace DX Lab

> **Developer observability + webhook reliability + API debugging in Next.js and strict TypeScript.**

[Source](https://github.com/Amyvdev1/Amyvdev1-mailtrace-dx-lab) · [Amy Villa on GitHub](https://github.com/Amyvdev1) · [Contact](mailto:amyv.dev@gmail.com)

## What it solves

MailTrace makes a simulated outbound-message lifecycle **inspectable** across request IDs, message IDs, signed webhook events, retries, idempotency, event ordering, raw payloads, and deterministic domain diagnostics.

## Why it exists

Most webhook demos stop at “the endpoint returned 200.” MailTrace treats the debugging experience as the product: identifiers stay visible, signed events can be verified and replayed, late arrivals do not silently corrupt current state, and failures explain the next action instead of returning an opaque error.

**Evidence boundary:** this lab **does not send real email**, **does not query live DNS**, does not use customer data, and is **not affiliated with Resend**. It demonstrates product and engineering decisions; it does not manufacture production credentials.

## Live demo

**Production deployment: pending.** The repository already contains a browser-level demo flow and Playwright E2E coverage. Until a stable public deployment is attached, reviewers can run the local demo path below without external API keys or live DNS dependencies.

## Architecture

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

### Stack

**Next.js 16 · React 19 · strict TypeScript · Node route handlers · SQLite · Zod · Vitest/RTL · Playwright · GitHub Actions · pnpm**

The dependency surface is intentionally small. Node's built-in `node:sqlite` keeps persistence inspectable for this local sample without adding an ORM.

## Key engineering decisions

| Decision | Why it is here |
|---|---|
| **HMAC-SHA256 over timestamp + exact raw body** | Demonstrates a realistic signed-webhook boundary and makes body mutation detectable. |
| **Constant-time signature comparison** | Avoids a timing-sensitive equality check at the verification boundary. |
| **Five-minute replay window** | Rejects stale signed requests while allowing small delivery-clock differences. |
| **Unique `provider_event_id`** | Makes retries idempotent and prevents duplicate timeline inserts. |
| **Monotonic lifecycle precedence** | A late-arriving lower-precedence event cannot silently regress the compact current status. |
| **Full event timeline remains visible** | Compact status and debugging truth are intentionally different views of the same lifecycle. |
| **SQLite** | Gives the sample real persistence and a visible uniqueness constraint without hiding behavior behind an ORM. |
| **Deterministic SPF/DKIM/DMARC fixtures** | Keeps diagnostics reproducible and honestly separated from live DNS behavior. |

## Reviewer flow

### 1. Create a trace

`POST /api/traces`

```json
{
  "recipient": "reviewer@example.com",
  "subject": "Observe this lifecycle"
}
```

The response exposes three identifiers on purpose:

- `traceId` — product record
- `requestId` — API/request correlation
- `messageId` — lifecycle/webhook correlation

### 2. Send a signed event

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

### 3. Inspect the timeline

The detail page shows lifecycle timestamp, receipt timestamp, arrival delay, retry attempt, signature state, provider event ID, raw payload, and an explicit out-of-order marker when receipt order disagrees with lifecycle order.

### 4. Replay the event

Reusing the same provider event ID for the same logical event returns an idempotent duplicate result and does not create a second timeline row.

### 5. Run a deterministic domain diagnostic

The fixture can reproduce healthy records, missing SPF, invalid DKIM selector/key data, and weak DMARC policy. Every result includes record, status, explanation, and next action and is labelled as **not a live DNS lookup**.

## Failure behavior

Errors use one predictable contract:

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

The sample handles invalid requests, invalid signatures, stale webhooks, missing traces, oversized payloads, disabled demo endpoints, and unexpected server failures. Reused provider IDs are accepted only when they represent the same logical event; conflicting reuse is rejected rather than silently deduplicated.

## Testing & CI

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

| Layer | What it proves |
|---|---|
| Architecture checks | Required routes, strict compiler posture, evidence boundaries, accessible UI hooks |
| Core runtime tests | Status precedence, HMAC verification, replay window, SQLite idempotency, webhook service, out-of-order reasoning |
| Vitest unit/integration | Domain rules, persistence, service behavior, API contract |
| Component tests | Debugging state and accessible raw-payload disclosure |
| Playwright | Trace → signed event → duplicate replay → raw inspection → broken domain fixture |
| GitHub Actions | Locked install, lint, typecheck, tests, production build, public-boundary checks, and browser E2E |

## Security / evidence boundaries

The sample demonstrates:

- HMAC-SHA256 verification
- constant-time signature comparison
- five-minute replay tolerance
- 64 KiB webhook body limit
- Zod validation before business logic
- unique provider event IDs
- React text rendering for raw payload inspection rather than HTML injection
- demo endpoint gating through an explicit environment variable
- secrets through environment configuration only

See [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) for the compact threat model.

This repository intentionally does **not** claim external email delivery, live DNS resolution, real users, customer data, multi-user authentication, background queues, managed infrastructure, deliverability metrics, enterprise scale, or security certification.

## 5-minute code review path

1. [`lib/signatures.ts`](lib/signatures.ts) — signature verification and replay resistance.
2. [`lib/repository.ts`](lib/repository.ts) — SQLite schema and idempotent provider-event insertion.
3. [`lib/webhook-service.ts`](lib/webhook-service.ts) — event-to-trace behavior and typed failures.
4. [`lib/timeline.ts`](lib/timeline.ts) — out-of-order arrival reasoning.
5. [`app/api/webhooks/events/route.ts`](app/api/webhooks/events/route.ts) — body limit, verification, validation, and error contract.
6. [`components/event-timeline.tsx`](components/event-timeline.tsx) — product-facing observability.
7. [`e2e/trace-debugging.spec.ts`](e2e/trace-debugging.spec.ts) — end-to-end reviewer path.

For a longer walkthrough, read [`docs/CODE_TOUR.md`](docs/CODE_TOUR.md).

## Run locally

Prerequisites: Node 22+ and pnpm 10.4.1.

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`.

To expose the browser demo controls locally, set:

```text
MAILTRACE_ENABLE_DEMO_ENDPOINTS=true
```

Do not enable the demo route by default in a deployed environment.

---

Built by **Amy Villa** as an inspectable Developer Observability / Developer Experience engineering sample.
