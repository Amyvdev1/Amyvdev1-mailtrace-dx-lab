import { describe, expect, it } from "vitest";
import { diagnoseDomainFixture } from "@/lib/domain-diagnostics";

describe("deterministic domain diagnostics", () => {
  it("marks a healthy fixture without pretending to query DNS", () => {
    const result = diagnoseDomainFixture("Example.dev", "healthy");
    expect(result.overall).toBe("healthy");
    expect(result.liveLookup).toBe(false);
    expect(result.domain).toBe("example.dev");
  });

  it("turns missing SPF into a concrete next action", () => {
    const result = diagnoseDomainFixture("example.dev", "missing-spf");
    expect(result.spf.status).toBe("fail");
    expect(result.spf.nextAction).toMatch(/SPF/i);
  });
});
