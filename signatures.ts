import { createHmac, timingSafeEqual } from "node:crypto";

export const WEBHOOK_REPLAY_WINDOW_SECONDS = 300;

export type SignatureVerificationResult =
  | { valid: true; reason: "verified" }
  | {
      valid: false;
      reason: "invalid_signature" | "stale_timestamp" | "invalid_timestamp";
    };

function hexToBytes(value: string): Uint8Array | null {
  if (!/^[a-f0-9]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    const parsed = Number.parseInt(value.slice(index, index + 2), 16);
    if (!Number.isFinite(parsed)) return null;
    bytes[index / 2] = parsed;
  }
  return bytes;
}

export function signWebhookBody(
  body: string,
  timestamp: number,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

export function verifyWebhookSignature(input: {
  body: string;
  timestamp: number;
  signature: string;
  secret: string;
  nowMs?: number;
  toleranceSeconds?: number;
}): SignatureVerificationResult {
  const {
    body,
    timestamp,
    signature,
    secret,
    nowMs = Date.now(),
    toleranceSeconds = WEBHOOK_REPLAY_WINDOW_SECONDS,
  } = input;

  if (!Number.isFinite(timestamp) || !Number.isInteger(timestamp)) {
    return { valid: false, reason: "invalid_timestamp" };
  }

  const ageSeconds = Math.abs(nowMs / 1000 - timestamp);
  if (ageSeconds > toleranceSeconds) {
    return { valid: false, reason: "stale_timestamp" };
  }

  const received = hexToBytes(signature);
  const expected = hexToBytes(signWebhookBody(body, timestamp, secret));
  if (!received || !expected || received.byteLength !== expected.byteLength) {
    return { valid: false, reason: "invalid_signature" };
  }

  return timingSafeEqual(received, expected)
    ? { valid: true, reason: "verified" }
    : { valid: false, reason: "invalid_signature" };
}
