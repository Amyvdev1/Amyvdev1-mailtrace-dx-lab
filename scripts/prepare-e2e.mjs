import { mkdirSync, rmSync } from "node:fs";

mkdirSync(".tmp", { recursive: true });
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(`.tmp/e2e.sqlite${suffix}`, { force: true });
}
console.log("E2E database reset.");
