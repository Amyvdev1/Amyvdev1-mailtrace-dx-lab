import { buildTimelineEntries } from "@/lib/timeline";
import type { DeliveryEvent } from "@/lib/types";

export function EventTimeline({ events }: { events: readonly DeliveryEvent[] }) {
  const entries = buildTimelineEntries(events);

  return (
    <section className="panel stack" aria-labelledby="timeline-title">
      <div className="section-label">EVENT OBSERVABILITY</div>
      <div className="section-heading">
        <div>
          <h2 id="timeline-title">Delivery timeline</h2>
          <p>Lifecycle time and receipt time stay visible so retries and out-of-order arrival are explainable.</p>
        </div>
        <span className="counter">{entries.length} events</span>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">No webhook events yet. Use a signed request or the local demo fixture.</div>
      ) : (
        <ol className="timeline">
          {entries.map(({ event, outOfOrderArrival, clockSkew, arrivalDelayLabel }) => (
            <li key={event.id} className="timeline-item">
              <div className="timeline-rail" aria-hidden="true"><span /></div>
              <article>
                <div className="event-head">
                  <div>
                    <span className={`status status-${event.type}`}>{event.type}</span>
                    {outOfOrderArrival ? <span className="warning-chip">OUT-OF-ORDER ARRIVAL</span> : null}
                    {clockSkew ? <span className="warning-chip">CLOCK SKEW</span> : null}
                  </div>
                  <code>{event.providerEventId}</code>
                </div>
                <dl className="event-meta">
                  <div><dt>Occurred</dt><dd>{new Date(event.occurredAt).toLocaleString()}</dd></div>
                  <div><dt>Received</dt><dd>{new Date(event.receivedAt).toLocaleString()}</dd></div>
                  <div><dt>Arrival delay</dt><dd>{arrivalDelayLabel}</dd></div>
                  <div><dt>Retry attempt</dt><dd>{event.retryAttempt}</dd></div>
                  <div><dt>Signature</dt><dd>{event.signatureValid ? "verified" : "invalid"}</dd></div>
                </dl>
                <details>
                  <summary>Inspect raw webhook payload</summary>
                  <pre>{event.rawPayload}</pre>
                </details>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
