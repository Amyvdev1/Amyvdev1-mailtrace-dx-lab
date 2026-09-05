import { createMailTraceDatabase, MailTraceRepository } from "./repository";

let repository: MailTraceRepository | undefined;

export function getMailTraceRepository(): MailTraceRepository {
  if (!repository) {
    const path = process.env.MAILTRACE_DATABASE_PATH ?? "./mailtrace.sqlite";
    repository = new MailTraceRepository(createMailTraceDatabase(path));
  }
  return repository;
}
