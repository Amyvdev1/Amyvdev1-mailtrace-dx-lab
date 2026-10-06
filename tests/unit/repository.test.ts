import { afterEach, describe, expect, it } from "vitest";
import { createMailTraceDatabase, MailTraceRepository } from "@/lib/repository";

const databases: ReturnType<typeof createMailTraceDatabase>[] = [];
afterEach(() => databases.splice(0).forEach((database) => database.close()));

describe("MailTraceRepository", () => {
  it("persists traces and idempotently ignores duplicate provider events", () => {
    const database = createMailTraceDatabase(":memory:");
    databases.push(database);
    const repository = new MailTraceRepository(database, () => "test");
    const trace = repository.createTrace({ recipient: "dev@example.com", subject: "Test" }, "2026-09-05T00:00:00.000Z");
    const event = {
      id: "event_1", traceId: trace.id, providerEventId: "evt_1", messageId: trace.messageId,
      type: "delivered" as const, occurredAt: "2026-09-05T00:00:01.000Z", receivedAt: "2026-09-05T00:00:02.000Z",
      arrivalDelayMs: 1000, retryAttempt: 0, signatureValid: true, payload: {}, rawPayload: "{}",
    };
    expect(repository.insertEvent(event)).toBe(true);
    expect(repository.insertEvent({ ...event, id: "event_2" })).toBe(false);
    expect(repository.listEvents(trace.id)).toHaveLength(1);
  });
});
