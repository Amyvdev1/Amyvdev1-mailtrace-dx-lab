import { describe, expect, it } from "vitest";
import { nextTraceStatus } from "@/lib/status-transitions";

describe("trace status transitions", () => {
  it("advances through ordinary lifecycle states", () => {
    expect(nextTraceStatus("queued", "sent")).toBe("sent");
    expect(nextTraceStatus("sent", "delivered")).toBe("delivered");
  });

  it("does not regress when an earlier event arrives late", () => {
    expect(nextTraceStatus("delivered", "sent")).toBe("delivered");
    expect(nextTraceStatus("bounced", "delivered")).toBe("bounced");
  });

  it("lets a complaint supersede a delivered state", () => {
    expect(nextTraceStatus("delivered", "complained")).toBe("complained");
  });
});
