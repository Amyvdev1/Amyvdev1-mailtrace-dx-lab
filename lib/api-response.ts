import type { ApiErrorBody, ApiErrorCode } from "./types";

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function jsonError(input: {
  requestId: string;
  code: ApiErrorCode;
  message: string;
  status: number;
  nextAction?: string;
}): Response {
  const body: ApiErrorBody = {
    error: {
      code: input.code,
      message: input.message,
      requestId: input.requestId,
      ...(input.nextAction ? { nextAction: input.nextAction } : {}),
    },
  };
  return Response.json(body, { status: input.status });
}
