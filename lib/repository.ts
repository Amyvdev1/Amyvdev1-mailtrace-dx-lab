import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DeliveryEvent, MessageTrace, TraceStatus } from "./types.js";

type TraceRow = {
  id: string;
  request_id: string;
  message_id: string;
  recipient: string;
  subject: string;
  status: TraceStatus;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  trace_id: string;
  provider_event_id: string;
  message_id: string;
  type: DeliveryEvent["type"];
  occurred_at: string;
  received_at: string;
  arrival_delay_ms: number;
  retry_attempt: number;
  signature_valid: number;
  payload_json: string;
  raw_payload: string;
};

function mapTrace(row: TraceRow): MessageTrace {
  return {
    id: row.id,
    requestId: row.request_id,
    messageId: row.message_id,
    recipient: row.recipient,
    subject: row.subject,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row: EventRow): DeliveryEvent {
  return {
    id: row.id,
    traceId: row.trace_id,
    providerEventId: row.provider_event_id,
    messageId: row.message_id,
    type: row.type,
    occurredAt: row.occurred_at,
    receivedAt: row.received_at,
    arrivalDelayMs: row.arrival_delay_ms,
    retryAttempt: row.retry_attempt,
    signatureValid: row.signature_valid === 1,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    rawPayload: row.raw_payload,
  };
}

export function createMailTraceDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") {
    mkdirSync(dirname(resolve(path)), { recursive: true });
  }

  const database = new DatabaseSync(path);
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      message_id TEXT NOT NULL UNIQUE,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_events (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
      provider_event_id TEXT NOT NULL UNIQUE,
      message_id TEXT NOT NULL,
      type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      received_at TEXT NOT NULL,
      arrival_delay_ms INTEGER NOT NULL,
      retry_attempt INTEGER NOT NULL,
      signature_valid INTEGER NOT NULL CHECK(signature_valid IN (0, 1)),
      payload_json TEXT NOT NULL,
      raw_payload TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_delivery_events_trace
      ON delivery_events(trace_id, occurred_at, received_at);
  `);
  return database;
}

export class MailTraceRepository {
  constructor(
    private readonly database: DatabaseSync,
    private readonly idFactory: () => string = randomUUID,
  ) {}

  createTrace(
    input: { recipient: string; subject: string },
    now = new Date().toISOString(),
  ): MessageTrace {
    const suffix = this.idFactory();
    const trace: MessageTrace = {
      id: `trace_${suffix}`,
      requestId: `req_${suffix}`,
      messageId: `msg_${suffix}`,
      recipient: input.recipient,
      subject: input.subject,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };

    this.database
      .prepare(`
        INSERT INTO traces (
          id, request_id, message_id, recipient, subject, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        trace.id,
        trace.requestId,
        trace.messageId,
        trace.recipient,
        trace.subject,
        trace.status,
        trace.createdAt,
        trace.updatedAt,
      );

    return trace;
  }

  listTraces(limit = 50): MessageTrace[] {
    const rows = this.database
      .prepare(`SELECT * FROM traces ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as TraceRow[];
    return rows.map(mapTrace);
  }

  getTrace(id: string): MessageTrace | null {
    const row = this.database.prepare(`SELECT * FROM traces WHERE id = ?`).get(id) as
      | TraceRow
      | undefined;
    return row ? mapTrace(row) : null;
  }

  findTraceByMessageId(messageId: string): MessageTrace | null {
    const row = this.database
      .prepare(`SELECT * FROM traces WHERE message_id = ?`)
      .get(messageId) as TraceRow | undefined;
    return row ? mapTrace(row) : null;
  }

  updateTraceStatus(id: string, status: TraceStatus, now = new Date().toISOString()): void {
    this.database
      .prepare(`UPDATE traces SET status = ?, updated_at = ? WHERE id = ?`)
      .run(status, now, id);
  }

  insertEvent(event: DeliveryEvent): boolean {
    const result = this.database
      .prepare(`
        INSERT OR IGNORE INTO delivery_events (
          id, trace_id, provider_event_id, message_id, type, occurred_at,
          received_at, arrival_delay_ms, retry_attempt, signature_valid,
          payload_json, raw_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        event.id,
        event.traceId,
        event.providerEventId,
        event.messageId,
        event.type,
        event.occurredAt,
        event.receivedAt,
        event.arrivalDelayMs,
        event.retryAttempt,
        event.signatureValid ? 1 : 0,
        JSON.stringify(event.payload),
        event.rawPayload,
      );
    return result.changes === 1;
  }

  findEventByProviderEventId(providerEventId: string): DeliveryEvent | null {
    const row = this.database
      .prepare(`SELECT * FROM delivery_events WHERE provider_event_id = ?`)
      .get(providerEventId) as EventRow | undefined;
    return row ? mapEvent(row) : null;
  }

  listEvents(traceId: string): DeliveryEvent[] {
    const rows = this.database
      .prepare(`
        SELECT * FROM delivery_events
        WHERE trace_id = ?
        ORDER BY occurred_at ASC, received_at ASC
      `)
      .all(traceId) as EventRow[];
    return rows.map(mapEvent);
  }
}
