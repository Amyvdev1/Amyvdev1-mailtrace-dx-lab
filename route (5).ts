import { jsonError, jsonOk } from "@/lib/api-response";
import { logEvent } from "@/lib/logger";
import { createRequestId } from "@/lib/request-id";
import { webhookEventSchema } from "@/lib/schemas";
import { getMailTraceRepository } from "@/lib/server-repository";
import { verifyWebhookSignature } from "@/lib/signatures";
import { MailTraceServiceError, processWebhookEvent } from "@/lib/webhook-service";

export const runtime = "nodejs";
export const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;

export async function POST(request: Request): Promise<Response> {
  const requestId = createRequestId();
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BODY_BYTES) {
    return jsonError({
      requestId,
      code: "PAYLOAD_TOO_LARGE",
      message: "Webhook payload exceeds the 64 KiB local-lab limit.",
      status: 413,
      nextAction: "Send only the event fields needed for this debugging sample.",
    });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BODY_BYTES) {
    return jsonError({
      requestId,
      code: "PAYLOAD_TOO_LARGE",
      message: "Webhook payload exceeds the 64 KiB local-lab limit.",
      status: 413,
      nextAction: "Send only the event fields needed for this debugging sample.",
    });
  }

  const signature = request.headers.get("x-mailtrace-signature") ?? "";
  const timestampHeader = request.headers.get("x-mailtrace-timestamp");
  if (!timestampHeader || !/^\d{10,}$/.test(timestampHeader)) {
    return jsonError({
      requestId,
      code: "INVALID_REQUEST",
      message: "Webhook timestamp header is missing or malformed.",
      status: 400,
      nextAction: "Send x-mailtrace-timestamp as Unix seconds and sign that exact timestamp with the raw body.",
    });
  }
  const timestamp = Number(timestampHeader);
  const secret = process.env.MAILTRACE_WEBHOOK_SECRET;
  if (!secret) {
    return jsonError({
      requestId,
      code: "INTERNAL_ERROR",
      message: "The local webhook secret is not configured.",
      status: 500,
      nextAction: "Set MAILTRACE_WEBHOOK_SECRET before exercising signed webhooks.",
    });
  }

  const verification = verifyWebhookSignature({
    body: rawBody,
    timestamp,
    signature,
    secret,
  });
  if (!verification.valid) {
    const stale = verification.reason === "stale_timestamp";
    logEvent("warn", "webhook.rejected", { requestId, reason: verification.reason });
    return jsonError({
      requestId,
      code: stale ? "STALE_WEBHOOK" : "INVALID_SIGNATURE",
      message: stale
        ? "Webhook timestamp is outside the five-minute replay window."
        : "Webhook signature could not be verified.",
      status: 401,
      nextAction: stale
        ? "Generate a fresh fixture timestamp and signature before retrying."
        : "Sign the exact raw request body with the configured local secret.",
    });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return jsonError({
      requestId,
      code: "INVALID_REQUEST",
      message: "Verified webhook body is not valid JSON.",
      status: 400,
      nextAction: "Send a JSON payload that matches the webhook event contract.",
    });
  }

  const parsed = webhookEventSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError({
      requestId,
      code: "INVALID_REQUEST",
      message: "Webhook payload did not match the event contract.",
      status: 422,
      nextAction: "Check providerEventId, messageId, type, occurredAt, retryAttempt, and payload.",
    });
  }

  try {
    const result = processWebhookEvent({
      repository: getMailTraceRepository(),
      event: parsed.data,
      rawBody,
    });
    if (result.kind === "duplicate") {
      logEvent("info", "webhook.duplicate", {
        requestId,
        traceId: result.trace.id,
        providerEventId: result.providerEventId,
      });
      return jsonOk({ requestId, status: "DUPLICATE", result });
    }

    logEvent("info", "webhook.accepted", {
      requestId,
      traceId: result.trace.id,
      providerEventId: result.event.providerEventId,
      retryAttempt: result.event.retryAttempt,
    });
    return jsonOk({ requestId, status: "ACCEPTED", result });
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
    logEvent("error", "webhook.failed", { requestId });
    return jsonError({
      requestId,
      code: "INTERNAL_ERROR",
      message: "Webhook processing failed unexpectedly.",
      status: 500,
      nextAction: "Inspect the structured server log entry using this request ID.",
    });
  }
}
