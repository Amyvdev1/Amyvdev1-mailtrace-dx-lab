"use client";

import { FormEvent, useState } from "react";

type Check = { status: "pass" | "warning" | "fail"; record: string; explanation: string; nextAction: string };
type Diagnostic = { domain: string; overall: string; liveLookup: false; spf: Check; dkim: Check; dmarc: Check };
type DiagnosticResponse = { diagnostic?: Diagnostic; error?: { message: string; nextAction?: string } };

export function DomainDiagnostics() {
  const [result, setResult] = useState<Diagnostic | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/diagnostics/domain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain: form.get("domain"), fixture: form.get("fixture") }),
      });
      const body = (await response.json()) as DiagnosticResponse;
      if (!response.ok || !body.diagnostic) {
        setResult(null);
        setMessage([body.error?.message, body.error?.nextAction].filter(Boolean).join(" "));
        return;
      }
      setResult(body.diagnostic);
    } catch {
      setMessage("The domain diagnostic API could not be reached.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel stack" aria-labelledby="domain-title">
      <div className="section-label">DOMAIN DIAGNOSTICS / DETERMINISTIC FIXTURES</div>
      <div className="section-heading">
        <div>
          <h2 id="domain-title">Explain configuration failures</h2>
          <p>This is not a live DNS lookup. Each fixture is deterministic so the debugging path is reproducible.</p>
        </div>
      </div>
      <form className="inline-form" onSubmit={submit}>
        <div><label htmlFor="domain">Domain</label><input id="domain" name="domain" defaultValue="example.dev" required /></div>
        <div>
          <label htmlFor="fixture">Fixture</label>
          <select id="fixture" name="fixture" defaultValue="healthy">
            <option value="healthy">Healthy</option>
            <option value="missing-spf">Missing SPF</option>
            <option value="invalid-dkim">Invalid DKIM</option>
            <option value="weak-dmarc">Weak DMARC</option>
          </select>
        </div>
        <button type="submit" disabled={pending}>{pending ? "Running…" : "Run diagnostic"}</button>
      </form>
      <p className="form-status" aria-live="polite">{message}</p>
      {result ? (
        <div className="diagnostic-grid" aria-live="polite">
          {(["spf", "dkim", "dmarc"] as const).map((key) => {
            const check = result[key];
            return (
              <article className={`diagnostic-card diagnostic-${check.status}`} key={key}>
                <div className="event-head"><strong>{key.toUpperCase()}</strong><span>{check.status}</span></div>
                <code className="record">{check.record}</code>
                <p>{check.explanation}</p>
                <p><b>Next action:</b> {check.nextAction}</p>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
