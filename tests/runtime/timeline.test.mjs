import { strict as assert } from 'node:assert';
import { buildTimelineEntries } from '../../.verify-dist/timeline.js';

const events = [
  {
    id: 'sent', traceId: 't', providerEventId: 'p1', messageId: 'm', type: 'sent',
    occurredAt: '2026-09-05T00:00:01.000Z', receivedAt: '2026-09-05T00:00:06.000Z', arrivalDelayMs: 5000,
    retryAttempt: 1, signatureValid: true, payload: {}, rawPayload: '{}'
  },
  {
    id: 'delivered', traceId: 't', providerEventId: 'p2', messageId: 'm', type: 'delivered',
    occurredAt: '2026-09-05T00:00:02.000Z', receivedAt: '2026-09-05T00:00:03.000Z', arrivalDelayMs: 1000,
    retryAttempt: 0, signatureValid: true, payload: {}, rawPayload: '{}'
  }
];
const timeline = buildTimelineEntries(events);
assert.equal(timeline[0].event.id, 'sent');
assert.equal(timeline[0].outOfOrderArrival, true, 'sent arrived after a later lifecycle event');
assert.equal(timeline[1].outOfOrderArrival, false);
assert.equal(timeline[0].arrivalDelayLabel, '5.00s');
assert.equal(timeline[1].arrivalDelayLabel, '1.00s');

const skewTimeline = buildTimelineEntries([{
  id: 'future', traceId: 't', providerEventId: 'p3', messageId: 'm', type: 'sent',
  occurredAt: '2026-09-05T00:00:05.000Z', receivedAt: '2026-09-05T00:00:02.000Z', arrivalDelayMs: -3000,
  retryAttempt: 0, signatureValid: true, payload: {}, rawPayload: '{}'
}]);
assert.equal(skewTimeline[0].clockSkew, true);
assert.equal(skewTimeline[0].arrivalDelayLabel, '-3.00s');

console.log('timeline reasoning test passed');
