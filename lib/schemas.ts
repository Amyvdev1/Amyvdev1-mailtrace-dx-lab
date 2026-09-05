import { z } from "zod";

export const createTraceSchema = z.object({
  recipient: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(200),
});

export const webhookEventSchema = z.object({
  providerEventId: z.string().trim().min(1).max(200),
  messageId: z.string().trim().min(1).max(200),
  type: z.enum(["sent", "delivered", "bounced", "complained", "failed"]),
  occurredAt: z.string().datetime({ offset: true }),
  retryAttempt: z.number().int().min(0).max(100),
  payload: z.record(z.string(), z.unknown()),
});

export const domainDiagnosticSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .regex(/^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/),
  fixture: z.enum(["healthy", "missing-spf", "invalid-dkim", "weak-dmarc"]),
});

export const demoEventSchema = z.object({
  messageId: z.string().trim().min(1).max(200),
  type: z.enum(["sent", "delivered", "bounced", "complained", "failed"]),
  providerEventId: z.string().trim().min(1).max(200).optional(),
  retryAttempt: z.number().int().min(0).max(100).default(0),
});
