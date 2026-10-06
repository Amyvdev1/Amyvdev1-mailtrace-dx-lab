import type { MessageTrace } from "@/lib/types";

export function TraceSummary({ trace }: { trace: MessageTrace }) {
  const identifiers = [
    ["Trace ID", trace.id],
    ["Request ID", trace.requestId],
    ["Message ID", trace.messageId],
  ] as const;

  return (
    <section className="panel stack" aria-labelledby="trace-summary-title">
      <div className="section-label">TRACE STATE</div>
      <div className="summary-head">
        <div>
          <h1 id="trace-summary-title">{trace.subject}</h1>
          <p>{trace.recipient}</p>
        </div>
        <span className={`status status-${trace.status}`}>{trace.status}</span>
      </div>
      <dl className="identifier-grid">
        {identifiers.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd><code>{value}</code></dd>
          </div>
        ))}
      </dl>
      <p className="muted">Updated {new Date(trace.updatedAt).toLocaleString()}</p>
    </section>
  );
}
