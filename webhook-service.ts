import { randomUUID } from "node:crypto";
import { normalizeDeliveryEvent } from "./event-normalization.js";
import type { MailTraceRepository } from "./repository.js";
import { nextTraceStatus } from "./status-transitions.js";
import type {
  ApiErrorCode,
  DeliveryEvent,
  DeliveryEventInput,
  MessageTrace,
} from "./types.js";

export class MailTraceServiceError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly nextAction?: string,
  ) {
    super(message);
    this.name = "MailTraceServiceError";
  }
}

export type WebhookProcessResult =
  | { kind: "accepted"; trace: MessageTrace; event: DeliveryEvent }
  | { kind: "duplicate"; trace: MessageTrace; providerEventId: string };

export function processWebhookEvent(input: {
  repository: MailTraceRepository;
  event: DeliveryEventInput;
  receivedAt?: string;
  eventIdFactory?: () => string;
  rawBody?: string;
}): WebhookProcessResult {
  const {
    repository,
    event,
    receivedAt = new Date().toISOString(),
    eventIdFactory = randomUUID,
    rawBody,
  } = input;

  const trace = repository.findTraceByMessageId(event.messageId);
  if (!trace) {
    throw new MailTraceServiceError(
      "TRACE_NOT_FOUND",
      `No trace exists for message ID ${event.messageId}.`,
      "Confirm that the webhook message ID matches a trace created by this local lab.",
    );
  }

  const existingEvent = repository.findEventByProviderEventId(event.providerEventId);
  if (existingEvent) {
    const sameLogicalEvent =
      existingEvent.messageId === event.messageId &&
      existingEvent.type === event.type &&
      existingEvent.occurredAt === event.occurredAt;

    if (!sameLogicalEvent) {
      throw new MailTraceServiceError(
        "EVENT_ID_CONFLICT",
        `Provider event ID ${event.providerEventId} is already bound to a different lifecycle event.`,
        "Use a stable provider event ID only for retries of the same logical event; generate a new ID for a different message or lifecycle state.",
      );
    }

    return {
      kind: "duplicate",
      trace: repository.getTrace(trace.id) ?? trace,
      providerEventId: event.providerEventId,
    };
  }

  const normalized = normalizeDeliveryEvent(event, receivedAt);
  const deliveryEvent: DeliveryEvent = {
    ...normalized,
    id: `event_${eventIdFactory()}`,
    traceId: trace.id,
    signatureValid: true,
    ...(rawBody ? { rawPayload: rawBody } : {}),
  };

  const inserted = repository.insertEvent(deliveryEvent);
  if (!inserted) {
    return {
      kind: "duplicate",
      trace: repository.getTrace(trace.id) ?? trace,
      providerEventId: event.providerEventId,
    };
  }

  const nextStatus = nextTraceStatus(trace.status, event.type);
  if (nextStatus !== trace.status) {
    repository.updateTraceStatus(trace.id, nextStatus, receivedAt);
  }

  return {
    kind: "accepted",
    trace: repository.getTrace(trace.id) ?? { ...trace, status: nextStatus },
    event: deliveryEvent,
  };
}
