import { strict as assert } from 'node:assert';
import { nextTraceStatus } from '../../.verify-dist/status-transitions.js';
import { diagnoseDomainFixture } from '../../.verify-dist/domain-diagnostics.js';
import { normalizeDeliveryEvent } from '../../.verify-dist/event-normalization.js';

assert.equal(nextTraceStatus('queued', 'sent'), 'sent');
assert.equal(nextTraceStatus('delivered', 'sent'), 'delivered', 'late sent event must not regress delivered');
assert.equal(nextTraceStatus('delivered', 'complained'), 'complained', 'complaint can supersede delivered');
assert.equal(nextTraceStatus('bounced', 'delivered'), 'bounced', 'late delivered event must not hide bounce');

const healthy = diagnoseDomainFixture('example.dev', 'healthy');
assert.equal(healthy.overall, 'healthy');
assert.equal(healthy.spf.status, 'pass');
assert.match(healthy.dmarc.nextAction, /monitor|maintain/i);

const missingSpf = diagnoseDomainFixture('example.dev', 'missing-spf');
assert.equal(missingSpf.overall, 'error');
assert.equal(missingSpf.spf.status, 'fail');
assert.match(missingSpf.spf.nextAction, /SPF/i);
assert.equal(missingSpf.liveLookup, false);

const normalized = normalizeDeliveryEvent({
  providerEventId: 'evt_01',
  messageId: 'msg_01',
  type: 'delivered',
  occurredAt: '2026-09-05T00:00:00.000Z',
  retryAttempt: 2,
  payload: { message_id: 'msg_01', event: 'delivered' },
}, '2026-09-05T00:00:03.000Z');
assert.equal(normalized.arrivalDelayMs, 3000);
assert.equal(normalized.retryAttempt, 2);
assert.equal(normalized.type, 'delivered');
assert.equal(normalized.rawPayload, JSON.stringify({ message_id: 'msg_01', event: 'delivered' }));


const futureTimestamp = normalizeDeliveryEvent({
  providerEventId: 'evt_future',
  messageId: 'msg_01',
  type: 'sent',
  occurredAt: '2026-09-05T00:00:05.000Z',
  retryAttempt: 0,
  payload: {},
}, '2026-09-05T00:00:02.000Z');
assert.equal(futureTimestamp.arrivalDelayMs, -3000, 'clock skew should stay visible instead of being clamped');

console.log('core domain behavior test passed');
