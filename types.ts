export type TraceStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed";

export type DeliveryEventType = Exclude<TraceStatus, "queued">;

export type MessageTrace = {
  id: string;
  requestId: string;
  messageId: string;
  recipient: string;
  subject: string;
  status: TraceStatus;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryEventInput = {
  providerEventId: string;
  messageId: string;
  type: DeliveryEventType;
  occurredAt: string;
  retryAttempt: number;
  payload: Record<string, unknown>;
};

export type NormalizedDeliveryEvent = DeliveryEventInput & {
  receivedAt: string;
  arrivalDelayMs: number;
  rawPayload: string;
};

export type DeliveryEvent = NormalizedDeliveryEvent & {
  id: string;
  traceId: string;
  signatureValid: boolean;
};

export type DiagnosticStatus = "pass" | "warning" | "fail";

export type DiagnosticCheck = {
  status: DiagnosticStatus;
  record: string;
  explanation: string;
  nextAction: string;
};

export type DomainDiagnostic = {
  domain: string;
  fixture: DomainFixtureName;
  liveLookup: false;
  spf: DiagnosticCheck;
  dkim: DiagnosticCheck;
  dmarc: DiagnosticCheck;
  overall: "healthy" | "warning" | "error";
};

export type DomainFixtureName =
  | "healthy"
  | "missing-spf"
  | "invalid-dkim"
  | "weak-dmarc";

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_SIGNATURE"
  | "STALE_WEBHOOK"
  | "TRACE_NOT_FOUND"
  | "EVENT_ID_CONFLICT"
  | "UNSUPPORTED_EVENT"
  | "PAYLOAD_TOO_LARGE"
  | "DEMO_DISABLED"
  | "INTERNAL_ERROR";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    nextAction?: string;
    requestId: string;
  };
};
