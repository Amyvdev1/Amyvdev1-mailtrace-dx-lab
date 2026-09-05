import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/events/route";

describe("webhook route contract", () => {
  it("rejects a missing timestamp header before body processing", async () => {
    const response = await POST(new Request("http://local/api/webhooks/events", {
      method: "POST",
      headers: { "content-type": "application/json", "x-mailtrace-signature": "deadbeef" },
      body: JSON.stringify({}),
    }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: { code: string; nextAction: string } };
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(body.error.nextAction).toMatch(/Unix seconds/i);
  });
});
