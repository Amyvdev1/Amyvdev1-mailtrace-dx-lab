import { createRequestId } from "@/lib/request-id";
import { jsonError, jsonOk } from "@/lib/api-response";
import { logEvent } from "@/lib/logger";
import { createTraceSchema } from "@/lib/schemas";
import { getMailTraceRepository } from "@/lib/server-repository";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const requestId = createRequestId();
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError({
      requestId,
      code: "INVALID_REQUEST",
      message: "Request body must be valid JSON.",
      status: 400,
      nextAction: "Send a JSON object with recipient and subject fields.",
    });
  }

  const parsed = createTraceSchema.safeParse(input);
  if (!parsed.success) {
    return jsonError({
      requestId,
      code: "INVALID_REQUEST",
      message: "Trace input did not match the API contract.",
      status: 422,
      nextAction: "Use a valid email recipient and a subject between 1 and 200 characters.",
    });
  }

  const trace = getMailTraceRepository().createTrace(parsed.data);
  logEvent("info", "trace.created", {
    requestId,
    traceId: trace.id,
    messageId: trace.messageId,
  });
  return jsonOk({ requestId, trace }, 201);
}

export async function GET(): Promise<Response> {
  return jsonOk({ traces: getMailTraceRepository().listTraces() });
}
