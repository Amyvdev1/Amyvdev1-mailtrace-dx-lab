import type { DeliveryEventType, TraceStatus } from "./types.js";

const precedence: Record<TraceStatus, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  failed: 3,
  bounced: 4,
  complained: 5,
};

/**
 * Keeps a compact current status without hiding contradictory or late events.
 * The full event timeline remains the source of truth for debugging.
 */
export function nextTraceStatus(
  current: TraceStatus,
  incoming: DeliveryEventType,
): TraceStatus {
  return precedence[incoming] >= precedence[current] ? incoming : current;
}
