import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';

for (const path of [
  'app/api/traces/route.ts',
  'app/api/traces/[id]/route.ts',
  'app/api/webhooks/events/route.ts',
  'app/api/diagnostics/domain/route.ts',
  'app/api/demo/events/route.ts',
  'lib/schemas.ts',
  'lib/api-response.ts',
]) assert.ok(existsSync(path), `${path} must exist`);

const webhook = readFileSync('app/api/webhooks/events/route.ts', 'utf8');
assert.match(webhook, /export const runtime = "nodejs"/);
assert.match(webhook, /MAX_WEBHOOK_BODY_BYTES/);
assert.match(webhook, /x-mailtrace-signature/i);
assert.match(webhook, /x-mailtrace-timestamp/i);
assert.match(webhook, /verifyWebhookSignature/);
assert.match(webhook, /webhookEventSchema/);
assert.match(webhook, /DUPLICATE/i);

const demo = readFileSync('app/api/demo/events/route.ts', 'utf8');
assert.match(demo, /MAILTRACE_ENABLE_DEMO_ENDPOINTS/);
assert.match(demo, /403/);

const error = readFileSync('lib/api-response.ts', 'utf8');
assert.match(error, /requestId/);
assert.match(error, /nextAction/);
console.log('API boundary architecture test passed');
