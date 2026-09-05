import Link from "next/link";

export default function NotFound() {
  return <main className="shell"><section className="panel stack"><div className="section-label">404 / TRACE NOT FOUND</div><h1>Unknown trace.</h1><p className="muted">The identifier does not map to a local MailTrace record.</p><Link className="text-link" href="/">Return to traces →</Link></section></main>;
}
