import { randomUUID } from "node:crypto";
import { jsonError, jsonOk } from "@/lib/api-response";
import { createRequestId } from "@/lib/request-id";
import { demoEventSchema } from "@/lib/schemas";
import { getMailTraceRepository } from "@/lib/server-repository";
import { signWebhookBody, verifyWebhookSignature } from "@/lib/signatures";
import { MailTraceServiceError, processWebhookEvent } from "@/lib/webhook-service";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const requestId = createRequestId();
  if (process.env.MAILTRACE_ENABLE_DEMO_ENDPOINTS !== "true") {
    return jsonError({
      requestId,
      code: "DEMO_DISABLED",
      message: "Deterministic demo endpoints are disabled.",
      status: 403,
      nextAction: "Set MAILTRACE_ENABLE_DEMO_ENDPOINTS=true only in local or test environments.",
    });
  }

  const secret = process.env.MAILTRACE_WEBHOOK_SECRET;
  if (!secret) {
    return jsonError({
      requestId,
      code: "INTERNAL_ERROR",
      message: "The local webhook secret is not configured.",
      status: 500,
      nextAction: "Set MAILTRACE_WEBHOOK_SECRET before running fixtures.",
    });
  }

  const parsed = demoEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError({
      requestId,
      code: "INVALID_REQUEST",
      message: "Demo event input is invalid.",
      status: 422,
      nextAction: "Send messageId, a supported event type, and optional retry metadata.",
    });
  }

  const occurredAt = new Date().toISOString();
  const event = {
    providerEventId: parsed.data.providerEventId ?? `demo_${randomUUID()}`,
    messageId: parsed.data.messageId,
    type: parsed.data.type,
    occurredAt,
    retryAttempt: parsed.data.retryAttempt,
    payload: { source: "deterministic-demo-fixture", type: parsed.data.type },
  } as const;
  const rawBody = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhookBody(rawBody, timestamp, secret);
  const verification = verifyWebhookSignature({ body: rawBody, timestamp, signature, secret });
  if (!verification.valid) {
    return jsonError({
      requestId,
      code: "INTERNAL_ERROR",
      message: "The deterministic fixture could not verify its own signature.",
      status: 500,
      nextAction: "Inspect the signature helper before trusting the demo path.",
    });
  }

  try {
    const result = processWebhookEvent({ repository: getMailTraceRepository(), event, rawBody });
    return jsonOk({ requestId, fixture: { timestamp, signature }, result });
  } catch (error) {
    if (error instanceof MailTraceServiceError) {
      return jsonError({
        requestId,
        code: error.code,
        message: error.message,
        status: error.code === "TRACE_NOT_FOUND" ? 404 : error.code === "EVENT_ID_CONFLICT" ? 409 : 422,
        nextAction: error.nextAction,
      });
    }
    return jsonError({
      requestId,
      code: "INTERNAL_ERROR",
      message: "Demo event processing failed unexpectedly.",
      status: 500,
      nextAction: "Inspect the local server logs using this request ID.",
    });
  }
}
