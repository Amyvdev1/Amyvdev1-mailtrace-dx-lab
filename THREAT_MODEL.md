# Compact Threat Model

MailTrace DX Lab is a local developer-experience sample. This document explains the risks the sample deliberately handles and the ones it leaves outside scope.

| Threat | Why it matters | Implemented control |
|---|---|---|
| Forged webhook | An untrusted caller could manufacture lifecycle state | HMAC-SHA256 over timestamp + exact raw body; constant-time comparison |
| Replay | A captured valid webhook could be sent much later | Five-minute timestamp window plus provider event idempotency |
| Duplicate retry | Providers often retry successful requests | `provider_event_id UNIQUE` + idempotent success response |
| Oversized body | Large payloads can consume memory/CPU | 64 KiB limit checked from header and actual encoded body |
| Malformed body | Unexpected shapes can reach business logic | JSON parse boundary + Zod schema validation |
| Unknown message ID | An authentic event can still be uncorrelated | Typed `TRACE_NOT_FOUND` + next action |
| Out-of-order delivery | Async events can arrive in a different order than they occurred | Preserve every event, mark receipt-order anomaly, prevent summary-state regression |
| Raw payload XSS | Webhook content may contain markup | Render raw body as React text; no HTML injection API |
| Demo endpoint exposure | Test helpers should not become normal product endpoints | Explicit `MAILTRACE_ENABLE_DEMO_ENDPOINTS=true` gate; disabled by default |
| Secret leakage | Signing secret should not enter git | `.env` ignored; only `.env.example` committed |

## Outside this sample

Authentication, tenant isolation, secret rotation, managed key storage, database encryption, rate limiting, external queues, live DNS, production telemetry export, retention/redaction policy, and compliance controls are deliberately not claimed here.
