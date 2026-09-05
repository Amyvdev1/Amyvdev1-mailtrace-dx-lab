import { describe, expect, it } from "vitest";
import {
  signWebhookBody,
  verifyWebhookSignature,
  WEBHOOK_REPLAY_WINDOW_SECONDS,
} from "@/lib/signatures";

describe("webhook signatures", () => {
  const body = JSON.stringify({ messageId: "msg_01", type: "delivered" });
  const secret = "unit-test-secret";
  const nowMs = Date.parse("2026-09-05T00:00:00.000Z");
  const timestamp = Math.floor(nowMs / 1000);

  it("accepts a valid HMAC-SHA256 signature inside the replay window", () => {
    const signature = signWebhookBody(body, timestamp, secret);
    expect(verifyWebhookSignature({ body, timestamp, signature, secret, nowMs })).toEqual({
      valid: true,
      reason: "verified",
    });
  });

  it("rejects a tampered payload without throwing", () => {
    const signature = signWebhookBody(body, timestamp, secret);
    expect(
      verifyWebhookSignature({ body: `${body}x`, timestamp, signature, secret, nowMs }),
    ).toEqual({ valid: false, reason: "invalid_signature" });
  });

  it("rejects timestamps older than the five-minute replay window", () => {
    const staleTimestamp = timestamp - WEBHOOK_REPLAY_WINDOW_SECONDS - 1;
    const signature = signWebhookBody(body, staleTimestamp, secret);
    expect(
      verifyWebhookSignature({ body, timestamp: staleTimestamp, signature, secret, nowMs }),
    ).toEqual({ valid: false, reason: "stale_timestamp" });
  });
});
