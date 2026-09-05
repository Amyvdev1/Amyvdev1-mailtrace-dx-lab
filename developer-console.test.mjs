import { existsSync, readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const required = [
  'components/trace-create-form.tsx',
  'components/trace-summary.tsx',
  'components/event-timeline.tsx',
  'components/domain-diagnostics.tsx',
  'components/demo-event-controls.tsx',
  'app/traces/[id]/page.tsx',
];
for (const path of required) assert.ok(existsSync(path), `${path} must exist`);

const timeline = readFileSync('components/event-timeline.tsx', 'utf8');
assert.match(timeline, /buildTimelineEntries/);
assert.match(timeline, /<details/);
assert.match(timeline, /rawPayload/);
assert.match(timeline, /outOfOrderArrival/);
assert.match(timeline, /signature/i);
assert.match(timeline, /retry/i);

const domain = readFileSync('components/domain-diagnostics.tsx', 'utf8');
assert.match(domain, /not a live DNS/i);
assert.match(domain, /aria-live/);

const form = readFileSync('components/trace-create-form.tsx', 'utf8');
assert.match(form, /<label/);
assert.match(form, /aria-live/);

const detail = readFileSync('app/traces/[id]/page.tsx', 'utf8');
assert.match(detail, /requestId/);
assert.match(detail, /messageId/);
assert.match(detail, /EventTimeline/);
console.log('developer console architecture test passed');
