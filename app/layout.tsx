import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MailTrace DX Lab",
  description: "A local developer tool for tracing email lifecycle events, webhook retries, signatures, and domain diagnostics.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
