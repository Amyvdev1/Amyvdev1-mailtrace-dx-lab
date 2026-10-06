import type {
  DeliveryEventInput,
  NormalizedDeliveryEvent,
} from "./types.js";

export function normalizeDeliveryEvent(
  event: DeliveryEventInput,
  receivedAt = new Date().toISOString(),
): NormalizedDeliveryEvent {
  const occurredMs = Date.parse(event.occurredAt);
  const receivedMs = Date.parse(receivedAt);

  if (!Number.isFinite(occurredMs) || !Number.isFinite(receivedMs)) {
    throw new RangeError("occurredAt and receivedAt must be valid ISO timestamps");
  }

  return {
    ...event,
    receivedAt,
    arrivalDelayMs: receivedMs - occurredMs,
    rawPayload: JSON.stringify(event.payload),
  };
}
