"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CreateTraceResponse = {
  trace?: { id: string };
  error?: { message: string; nextAction?: string };
};

export function TraceCreateForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/traces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipient: String(form.get("recipient") ?? ""),
          subject: String(form.get("subject") ?? ""),
        }),
      });
      const body = (await response.json()) as CreateTraceResponse;
      if (!response.ok || !body.trace) {
        setMessage(
          [body.error?.message, body.error?.nextAction].filter(Boolean).join(" ") ||
            "Trace creation failed.",
        );
        return;
      }
      router.push(`/traces/${body.trace.id}`);
      router.refresh();
    } catch {
      setMessage("The trace API could not be reached. Check the local server and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="panel stack" onSubmit={submit}>
      <div className="section-label">01 / CREATE TRACE</div>
      <div>
        <label htmlFor="recipient">Recipient</label>
        <input id="recipient" name="recipient" type="email" required placeholder="dev@example.com" />
      </div>
      <div>
        <label htmlFor="subject">Subject</label>
        <input id="subject" name="subject" required maxLength={200} placeholder="Webhook debugging trace" />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? "Creating trace…" : "Create local trace"}
      </button>
      <p className="form-status" aria-live="polite">{message}</p>
    </form>
  );
}
