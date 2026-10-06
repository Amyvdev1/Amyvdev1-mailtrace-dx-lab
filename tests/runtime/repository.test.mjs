import { strict as assert } from 'node:assert';
import { createMailTraceDatabase, MailTraceRepository } from '../../.verify-dist/repository.js';

const database = createMailTraceDatabase(':memory:');
const repo = new MailTraceRepository(database, () => 'fixed-id');
const trace = repo.createTrace({ recipient: 'dev@example.com', subject: 'Trace me' }, '2026-09-05T00:00:00.000Z');
assert.equal(trace.id, 'trace_fixed-id');
assert.equal(trace.requestId, 'req_fixed-id');
assert.equal(trace.messageId, 'msg_fixed-id');
assert.equal(trace.status, 'queued');
assert.equal(repo.getTrace(trace.id)?.recipient, 'dev@example.com');
assert.equal(repo.findTraceByMessageId(trace.messageId)?.id, trace.id);

const inserted = repo.insertEvent({
  id: 'event_1',
  traceId: trace.id,
  providerEventId: 'provider_evt_1',
  messageId: trace.messageId,
  type: 'delivered',
  occurredAt: '2026-09-05T00:00:02.000Z',
  receivedAt: '2026-09-05T00:00:03.000Z',
  arrivalDelayMs: 1000,
  retryAttempt: 0,
  signatureValid: true,
  payload: { type: 'delivered' },
  rawPayload: '{"type":"delivered"}',
});
assert.equal(inserted, true);
assert.equal(repo.insertEvent({
  id: 'event_2',
  traceId: trace.id,
  providerEventId: 'provider_evt_1',
  messageId: trace.messageId,
  type: 'delivered',
  occurredAt: '2026-09-05T00:00:02.000Z',
  receivedAt: '2026-09-05T00:00:04.000Z',
  arrivalDelayMs: 2000,
  retryAttempt: 1,
  signatureValid: true,
  payload: { type: 'delivered' },
  rawPayload: '{"type":"delivered"}',
}), false, 'duplicate provider event must be idempotent');
assert.equal(repo.listEvents(trace.id).length, 1);
repo.updateTraceStatus(trace.id, 'delivered', '2026-09-05T00:00:03.000Z');
assert.equal(repo.getTrace(trace.id)?.status, 'delivered');
console.log('repository behavior test passed');
