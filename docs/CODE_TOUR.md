# MailTrace DX Lab — Code Tour

This guide is the shortest path from the product surface to the engineering decisions behind it.

## 1. Product boundary

`app/page.tsx` presents two developer workflows: create a trace and run deterministic domain diagnostics. The page explicitly states the evidence boundary: local simulation only, no external sender and no live DNS.

`app/traces/[id]/page.tsx` is the debugging surface. It keeps request/message correlation IDs prominent, then renders local event controls and the delivery timeline.

## 2. HTTP contract

`app/api/webhooks/events/route.ts` is the most important server boundary.

The route:

1. allocates a request ID,
2. rejects an oversized body at both header and actual-byte levels,
3. reads the exact raw body,
4. verifies HMAC + replay timestamp,
5. parses JSON only after authenticity verification,
6. validates the event schema with Zod,
7. delegates business behavior to `processWebhookEvent`,
8. returns an idempotent success for duplicate provider events,
9. converts service failures to a stable API error contract,
10. emits structured log events with correlation fields.

This ordering is intentional: authentication and resource bounds happen before trusting body fields.

## 3. Signature security

`lib/signatures.ts` signs `<timestamp>.<raw body>` with HMAC-SHA256. Verification checks timestamp validity, enforces a 300-second replay window, decodes fixed-length hex signatures, and uses Node's constant-time comparison.

`tests/unit/signatures.test.ts` and `tests/runtime/signatures.test.mjs` cover valid, tampered, stale, and malformed signatures.

## 4. Persistence and idempotency

`lib/repository.ts` owns the local SQLite boundary. It creates:

- `traces`, keyed by trace ID with unique request/message IDs,
- `delivery_events`, keyed by event ID with `provider_event_id UNIQUE`.

`INSERT OR IGNORE` makes duplicate provider event IDs an explicit repository result rather than an exception-driven control path.

There is no ORM because the schema is intentionally small and the SQL is part of the code sample being reviewed.

## 5. Lifecycle behavior

`lib/status-transitions.ts` defines a compact precedence model for current trace status. A late `sent` event cannot regress a delivered/bounced/complained trace.

Importantly, this does not delete or hide the late event. `lib/timeline.ts` keeps the full sequence and compares lifecycle timestamps with receipt timestamps to mark out-of-order arrival.

That split is a product decision: **summary state stays useful while the debugging history stays honest**.

## 6. Developer-facing timeline

`components/event-timeline.tsx` renders the output of `buildTimelineEntries` with:

- event type,
- provider event ID,
- lifecycle and receipt time,
- arrival delay,
- retry attempt,
- signature status,
- out-of-order marker,
- native `<details>` disclosure for the raw payload.

Raw payloads are rendered as React text inside `<pre>`; the component does not inject webhook HTML.

## 7. Domain diagnostics

`lib/domain-diagnostics.ts` owns deterministic SPF/DKIM/DMARC fixtures. It returns both explanation and next action because a diagnostic product should answer “what now?” rather than only “pass/fail.”

`components/domain-diagnostics.tsx` labels the workflow as a deterministic fixture and repeats that it is not live DNS.

## 8. Demo event route

`app/api/demo/events/route.ts` exists only for local/test reproduction. It is disabled unless `MAILTRACE_ENABLE_DEMO_ENDPOINTS=true`.

The route builds a deterministic event, signs it with the same HMAC helper, verifies the result, then sends the typed event through the same application service as the webhook route. The browser uses stable provider event IDs so a second click demonstrates idempotency.

## 9. Verification

The repository intentionally has two test paths:

- dependency-free architecture/core tests that can exercise the domain and SQLite behavior with only Node + TypeScript,
- standard Vitest/RTL/Playwright checks that run in CI with the full application dependencies.

The E2E test is the recruiter path: create trace → delivered event → duplicate replay → raw payload → broken SPF fixture.

## 10. Production questions, not claims

If this moved beyond a local engineering sample, the next design discussion would include managed persistence/migrations, multi-user auth and tenancy, queue semantics, webhook retry policy, secrets rotation, live DNS, structured telemetry export, rate limiting, retention, redaction, and incident response.

Those concerns are documented as the next boundary; they are not presented as already implemented.
