"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DeliveryEventType } from "@/lib/types";

const eventTypes: DeliveryEventType[] = ["sent", "delivered", "bounced", "complained", "failed"];

export function DemoEventControls({ messageId, enabled }: { messageId: string; enabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<DeliveryEventType | null>(null);
  const [message, setMessage] = useState("");

  if (!enabled) {
    return (
      <section className="panel stack">
        <div className="section-label">DEMO FIXTURES</div>
        <p className="muted">Demo event generation is disabled. Send a signed webhook manually or enable local demo endpoints.</p>
      </section>
    );
  }

  async function trigger(type: DeliveryEventType) {
    setPending(type);
    setMessage("");
    try {
      const response = await fetch("/api/demo/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messageId,
          type,
          retryAttempt: 0,
          providerEventId: `demo_${messageId}_${type}`,
        }),
      });
      const body = (await response.json()) as {
        error?: { message?: string };
        result?: { kind?: "accepted" | "duplicate" };
      };
      if (!response.ok) {
        setMessage(body.error?.message ?? "Demo event failed.");
        return;
      }
      setMessage(
        body.result?.kind === "duplicate"
          ? `${type} fixture was idempotently ignored as a duplicate.`
          : `${type} fixture accepted. Timeline refreshed.`,
      );
      router.refresh();
    } catch {
      setMessage("Demo event API could not be reached.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="panel stack" aria-labelledby="demo-title">
      <div className="section-label">LOCAL SIGNED EVENT FIXTURES</div>
      <h2 id="demo-title">Exercise the lifecycle</h2>
      <div className="button-row">
        {eventTypes.map((type) => (
          <button key={type} type="button" onClick={() => trigger(type)} disabled={pending !== null}>
            {pending === type ? "Sending…" : type}
          </button>
        ))}
      </div>
      <p className="form-status" aria-live="polite">{message}</p>
    </section>
  );
}
