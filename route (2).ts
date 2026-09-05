import { jsonError, jsonOk } from "@/lib/api-response";
import { createRequestId } from "@/lib/request-id";
import { getMailTraceRepository } from "@/lib/server-repository";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = createRequestId();
  const { id } = await context.params;
  const repository = getMailTraceRepository();
  const trace = repository.getTrace(id);

  if (!trace) {
    return jsonError({
      requestId,
      code: "TRACE_NOT_FOUND",
      message: `No trace exists for ${id}.`,
      status: 404,
      nextAction: "Return to the trace list and choose an existing trace ID.",
    });
  }

  return jsonOk({ requestId, trace, events: repository.listEvents(trace.id) });
}
