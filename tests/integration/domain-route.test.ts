import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/diagnostics/domain/route";

describe("domain diagnostic route", () => {
  it("returns a deterministic broken-SPF result", async () => {
    const response = await POST(new Request("http://local/api/diagnostics/domain", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain: "example.dev", fixture: "missing-spf" }),
    }));
    expect(response.status).toBe(200);
    const body = await response.json() as { diagnostic: { liveLookup: boolean; spf: { status: string } } };
    expect(body.diagnostic.liveLookup).toBe(false);
    expect(body.diagnostic.spf.status).toBe("fail");
  });
});
