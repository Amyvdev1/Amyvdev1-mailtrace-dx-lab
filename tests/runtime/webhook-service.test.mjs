import { strict as assert } from 'node:assert';
import { createMailTraceDatabase, MailTraceRepository } from '../../.verify-dist/repository.js';
import { processWebhookEvent, MailTraceServiceError } from '../../.verify-dist/webhook-service.js';

const db = createMailTraceDatabase(':memory:');
let idCounter = 0;
const repo = new MailTraceRepository(db, () => `id${++idCounter}`);
const trace = repo.createTrace({ recipient: 'dev@example.com', subject: 'Observe me' }, '2026-09-05T00:00:00.000Z');

const accepted = processWebhookEvent({
  repository: repo,
  event: {
    providerEventId: 'evt_delivered',
    messageId: trace.messageId,
    type: 'delivered',
    occurredAt: '2026-09-05T00:00:02.000Z',
    retryAttempt: 0,
    payload: { type: 'delivered' },
  },
  receivedAt: '2026-09-05T00:00:03.000Z',
  eventIdFactory: () => 'event_one',
});
assert.equal(accepted.kind, 'accepted');
assert.equal(accepted.trace.status, 'delivered');
assert.equal(repo.listEvents(trace.id).length, 1);

const duplicate = processWebhookEvent({
  repository: repo,
  event: {
    providerEventId: 'evt_delivered',
    messageId: trace.messageId,
    type: 'delivered',
    occurredAt: '2026-09-05T00:00:02.000Z',
    retryAttempt: 1,
    payload: { type: 'delivered' },
  },
  receivedAt: '2026-09-05T00:00:04.000Z',
  eventIdFactory: () => 'event_two',
});
assert.equal(duplicate.kind, 'duplicate');
assert.equal(repo.listEvents(trace.id).length, 1);

processWebhookEvent({
  repository: repo,
  event: {
    providerEventId: 'evt_late_sent',
    messageId: trace.messageId,
    type: 'sent',
    occurredAt: '2026-09-05T00:00:01.000Z',
    retryAttempt: 1,
    payload: { type: 'sent' },
  },
  receivedAt: '2026-09-05T00:00:05.000Z',
  eventIdFactory: () => 'event_three',
});
assert.equal(repo.getTrace(trace.id)?.status, 'delivered', 'late sent event must not regress status');
assert.equal(repo.listEvents(trace.id).length, 2, 'late event remains visible in timeline');

assert.throws(() => processWebhookEvent({
  repository: repo,
  event: {
    providerEventId: 'evt_unknown',
    messageId: 'msg_missing',
    type: 'failed',
    occurredAt: '2026-09-05T00:00:01.000Z',
    retryAttempt: 0,
    payload: {},
  },
  eventIdFactory: () => 'event_four',
}), (error) => error instanceof MailTraceServiceError && error.code === 'TRACE_NOT_FOUND');


const secondTrace = repo.createTrace({ recipient: 'other@example.com', subject: 'Other' }, '2026-09-05T00:01:00.000Z');
assert.throws(() => processWebhookEvent({
  repository: repo,
  event: {
    providerEventId: 'evt_delivered',
    messageId: secondTrace.messageId,
    type: 'failed',
    occurredAt: '2026-09-05T00:01:01.000Z',
    retryAttempt: 0,
    payload: {},
  },
  eventIdFactory: () => 'event_conflict',
}), (error) => error instanceof MailTraceServiceError && error.code === 'EVENT_ID_CONFLICT');

console.log('webhook service behavior test passed');
