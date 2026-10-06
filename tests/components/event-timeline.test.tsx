import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventTimeline } from "@/components/event-timeline";

const events = [
  {
    id: "sent", traceId: "trace", providerEventId: "evt_sent", messageId: "msg", type: "sent" as const,
    occurredAt: "2026-09-05T00:00:01.000Z", receivedAt: "2026-09-05T00:00:06.000Z", arrivalDelayMs: 5000,
    retryAttempt: 1, signatureValid: true, payload: {}, rawPayload: '{"event":"sent"}',
  },
  {
    id: "delivered", traceId: "trace", providerEventId: "evt_delivered", messageId: "msg", type: "delivered" as const,
    occurredAt: "2026-09-05T00:00:02.000Z", receivedAt: "2026-09-05T00:00:03.000Z", arrivalDelayMs: 1000,
    retryAttempt: 0, signatureValid: true, payload: {}, rawPayload: '{"event":"delivered"}',
  },
];

describe("EventTimeline", () => {
  it("exposes late-arrival reasoning and an accessible raw payload disclosure", () => {
    render(<EventTimeline events={events} />);
    expect(screen.getByText("OUT-OF-ORDER ARRIVAL")).toBeInTheDocument();
    expect(screen.getAllByText(/verified/i)).toHaveLength(2);
    expect(screen.getAllByText("Inspect raw webhook payload")).toHaveLength(2);
  });
});
