import type {
  DiagnosticCheck,
  DomainDiagnostic,
  DomainFixtureName,
} from "./types.js";

const pass = (record: string, explanation: string): DiagnosticCheck => ({
  status: "pass",
  record,
  explanation,
  nextAction: "Maintain the record and monitor future configuration changes.",
});

const warning = (
  record: string,
  explanation: string,
  nextAction: string,
): DiagnosticCheck => ({ status: "warning", record, explanation, nextAction });

const fail = (
  record: string,
  explanation: string,
  nextAction: string,
): DiagnosticCheck => ({ status: "fail", record, explanation, nextAction });

export function diagnoseDomainFixture(
  domain: string,
  fixture: DomainFixtureName,
): DomainDiagnostic {
  const normalizedDomain = domain.trim().toLowerCase();

  const healthy = {
    spf: pass(
      "v=spf1 include:_spf.example.test -all",
      "The sample SPF policy authorizes a sender and ends with a strict all mechanism.",
    ),
    dkim: pass(
      "mail._domainkey TXT v=DKIM1; k=rsa; p=DEMO_PUBLIC_KEY",
      "The sample DKIM selector exposes a syntactically valid public-key record.",
    ),
    dmarc: pass(
      "_dmarc TXT v=DMARC1; p=quarantine; rua=mailto:dmarc@example.test",
      "The sample DMARC policy requests enforcement and aggregate reporting.",
    ),
  } satisfies Pick<DomainDiagnostic, "spf" | "dkim" | "dmarc">;

  switch (fixture) {
    case "healthy":
      return {
        domain: normalizedDomain,
        fixture,
        liveLookup: false,
        ...healthy,
        overall: "healthy",
      };
    case "missing-spf":
      return {
        domain: normalizedDomain,
        fixture,
        liveLookup: false,
        ...healthy,
        spf: fail(
          "No SPF fixture record",
          "The deterministic fixture has no SPF policy, so sender authorization cannot be evaluated.",
          "Publish one SPF TXT record for the domain and include only the senders that should be authorized.",
        ),
        overall: "error",
      };
    case "invalid-dkim":
      return {
        domain: normalizedDomain,
        fixture,
        liveLookup: false,
        ...healthy,
        dkim: fail(
          "mail._domainkey TXT v=DKIM1; k=rsa; p=",
          "The deterministic fixture exposes a selector but no usable public key.",
          "Publish a valid DKIM public key at the selector expected by the sending system.",
        ),
        overall: "error",
      };
    case "weak-dmarc":
      return {
        domain: normalizedDomain,
        fixture,
        liveLookup: false,
        ...healthy,
        dmarc: warning(
          "_dmarc TXT v=DMARC1; p=none",
          "The deterministic fixture observes mail but does not request quarantine or rejection.",
          "Review aggregate reports, then move toward quarantine or reject when legitimate traffic is aligned.",
        ),
        overall: "warning",
      };
  }
}
