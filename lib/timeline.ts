import type { DeliveryEvent } from "./types.js";

export type TimelineEntry = {
  event: DeliveryEvent;
  outOfOrderArrival: boolean;
  clockSkew: boolean;
  arrivalDelayLabel: string;
};

function formatDelay(milliseconds: number): string {
  if (Math.abs(milliseconds) < 1000) return `${milliseconds}ms`;
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

export function buildTimelineEntries(events: readonly DeliveryEvent[]): TimelineEntry[] {
  return [...events]
    .sort((a, b) => {
      const occurred = Date.parse(a.occurredAt) - Date.parse(b.occurredAt);
      return occurred !== 0 ? occurred : Date.parse(a.receivedAt) - Date.parse(b.receivedAt);
    })
    .map((event, index, ordered) => {
      const eventOccurredAt = Date.parse(event.occurredAt);
      const eventReceivedAt = Date.parse(event.receivedAt);
      const outOfOrderArrival = ordered.some((other, otherIndex) => {
        if (otherIndex === index) return false;
        return (
          Date.parse(other.occurredAt) > eventOccurredAt &&
          Date.parse(other.receivedAt) < eventReceivedAt
        );
      });
      return {
        event,
        outOfOrderArrival,
        clockSkew: event.arrivalDelayMs < 0,
        arrivalDelayLabel: formatDelay(event.arrivalDelayMs),
      };
    });
}
