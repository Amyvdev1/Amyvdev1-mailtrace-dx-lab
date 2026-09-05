import { afterEach, describe, expect, it } from "vitest";
import { createMailTraceDatabase, MailTraceRepository } from "@/lib/repository";
import { processWebhookEvent } from "@/lib/webhook-service";

const databases: ReturnType<typeof createMailTraceDatabase>[] = [];
afterEach(() => databases.splice(0).forEach((database) => database.close()));

describe("webhook service", () => {
  it("records an accepted event and returns duplicate on replay", () => {
    const database = createMailTraceDatabase(":memory:"); databases.push(database);
    const repository = new MailTraceRepository(database, () => "trace");
    const trace = repository.createTrace({ recipient: "dev@example.com", subject: "Observe" });
    const event = { providerEventId: "provider_1", messageId: trace.messageId, type: "delivered" as const, occurredAt: new Date().toISOString(), retryAttempt: 0, payload: {} };
    expect(processWebhookEvent({ repository, event, eventIdFactory: () => "event1" }).kind).toBe("accepted");
    expect(processWebhookEvent({ repository, event, eventIdFactory: () => "event2" }).kind).toBe("duplicate");
  });
  it("rejects provider event ID reuse across different logical events", () => {
    const database = createMailTraceDatabase(":memory:"); databases.push(database);
    let counter = 0;
    const repository = new MailTraceRepository(database, () => `trace${++counter}`);
    const first = repository.createTrace({ recipient: "a@example.com", subject: "A" });
    const second = repository.createTrace({ recipient: "b@example.com", subject: "B" });
    processWebhookEvent({
      repository,
      event: { providerEventId: "provider_shared", messageId: first.messageId, type: "delivered", occurredAt: "2026-09-05T00:00:00.000Z", retryAttempt: 0, payload: {} },
      eventIdFactory: () => "event1",
    });
    expect(() => processWebhookEvent({
      repository,
      event: { providerEventId: "provider_shared", messageId: second.messageId, type: "failed", occurredAt: "2026-09-05T00:00:01.000Z", retryAttempt: 0, payload: {} },
      eventIdFactory: () => "event2",
    })).toThrow(/already bound/i);
  });

});
