import { jsonError, jsonOk } from "@/lib/api-response";
import { diagnoseDomainFixture } from "@/lib/domain-diagnostics";
import { createRequestId } from "@/lib/request-id";
import { domainDiagnosticSchema } from "@/lib/schemas";

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
      nextAction: "Send a domain and one deterministic fixture name.",
    });
  }

  const parsed = domainDiagnosticSchema.safeParse(input);
  if (!parsed.success) {
    return jsonError({
      requestId,
      code: "INVALID_REQUEST",
      message: "Domain diagnostic input is invalid.",
      status: 422,
      nextAction: "Use a hostname such as example.dev and one supported deterministic fixture.",
    });
  }

  return jsonOk({ requestId, diagnostic: diagnoseDomainFixture(parsed.data.domain, parsed.data.fixture) });
}
