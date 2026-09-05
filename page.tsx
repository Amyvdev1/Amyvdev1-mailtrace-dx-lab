import Link from "next/link";
import { DomainDiagnostics } from "@/components/domain-diagnostics";
import { TraceCreateForm } from "@/components/trace-create-form";
import { getMailTraceRepository } from "@/lib/server-repository";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const traces = getMailTraceRepository().listTraces(12);

  return (
    <main className="shell stack-large">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">DEVELOPER EXPERIENCE / EMAIL OBSERVABILITY LAB</p>
        <h1 id="page-title">MailTrace DX Lab</h1>
        <p className="lede">
          Trace a simulated outbound message through signed webhook events, retries,
          idempotency, lifecycle ordering, and deterministic domain diagnostics.
        </p>
        <div className="boundary" role="note">
          Local engineering sample. It does not send real email, query live DNS, use Resend APIs, or imply live service usage.
        </div>
      </section>

      <div className="two-column">
        <TraceCreateForm />
        <section className="panel stack" aria-labelledby="recent-title">
          <div className="section-label">02 / RECENT TRACES</div>
          <h2 id="recent-title">Inspectable message state</h2>
          {traces.length === 0 ? <p className="muted">No traces yet.</p> : (
            <ul className="trace-list">
              {traces.map((trace) => (
                <li key={trace.id}>
                  <Link href={`/traces/${trace.id}`}>
                    <span><strong>{trace.subject}</strong><small>{trace.recipient}</small></span>
                    <span className={`status status-${trace.status}`}>{trace.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DomainDiagnostics />
    </main>
  );
}
