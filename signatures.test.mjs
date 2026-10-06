import { strict as assert } from 'node:assert';
import { signWebhookBody, verifyWebhookSignature } from '../../.verify-dist/signatures.js';

const secret = 'local-test-secret';
const body = JSON.stringify({ messageId: 'msg_01', type: 'delivered' });
const nowMs = Date.parse('2026-09-05T00:00:00.000Z');
const timestamp = Math.floor(nowMs / 1000);
const signature = signWebhookBody(body, timestamp, secret);

assert.match(signature, /^[a-f0-9]{64}$/);
assert.deepEqual(
  verifyWebhookSignature({ body, timestamp, signature, secret, nowMs }),
  { valid: true, reason: 'verified' },
);
assert.deepEqual(
  verifyWebhookSignature({ body: `${body}x`, timestamp, signature, secret, nowMs }),
  { valid: false, reason: 'invalid_signature' },
);
assert.deepEqual(
  verifyWebhookSignature({ body, timestamp: timestamp - 301, signature, secret, nowMs }),
  { valid: false, reason: 'stale_timestamp' },
);
assert.deepEqual(
  verifyWebhookSignature({ body, timestamp, signature: 'abcd', secret, nowMs }),
  { valid: false, reason: 'invalid_signature' },
);
assert.deepEqual(
  verifyWebhookSignature({ body, timestamp: Number.NaN, signature, secret, nowMs }),
  { valid: false, reason: 'invalid_timestamp' },
);
console.log('webhook signature behavior test passed');
