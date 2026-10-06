import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoEventControls } from "@/components/demo-event-controls";
import { EventTimeline } from "@/components/event-timeline";
import { TraceSummary } from "@/components/trace-summary";
import { getMailTraceRepository } from "@/lib/server-repository";

export const dynamic = "force-dynamic";

export default async function TraceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repository = getMailTraceRepository();
  const trace = repository.getTrace(id);
  if (!trace) notFound();
  const events = repository.listEvents(trace.id);
  const demoEnabled = process.env.MAILTRACE_ENABLE_DEMO_ENDPOINTS === "true";

  return (
    <main className="shell stack-large">
      <nav className="top-nav" aria-label="Trace navigation"><Link href="/">← All traces</Link><span>MAILTRACE / DEBUG SESSION</span></nav>
      <TraceSummary trace={trace} />
      <div className="identifier-callout">
        <div><span>REQUEST CORRELATION</span><code>{trace.requestId}</code></div>
        <div><span>MESSAGE CORRELATION</span><code>{trace.messageId}</code></div>
      </div>
      <DemoEventControls messageId={trace.messageId} enabled={demoEnabled} />
      <EventTimeline events={events} />
    </main>
  );
}
