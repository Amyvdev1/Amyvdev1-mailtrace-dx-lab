import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

if (existsSync(".env") || existsSync(".env.local")) {
  throw new Error("A real environment file is present. Only .env.example may be committed.");
}

const roots = ["app", "components", "lib", "fixtures", "docs", "README.md"];
const forbidden = [
  /api\.resend\.com/i,
  /RESEND_API_KEY/,
  /from ["']resend["']/,
  /node:dns/,
  /production customers?/i,
  /production traffic/i,
];

function filesAt(path) {
  if (!existsSync(path)) return [];
  const stat = readdirSync(path, { withFileTypes: true });
  return stat.flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? filesAt(child) : [child];
  });
}

const files = roots.flatMap((root) => root.endsWith(".md") ? [root] : filesAt(root));
for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(content)) throw new Error(`Public evidence boundary failed in ${file}: ${pattern}`);
  }
}

const readme = readFileSync("README.md", "utf8");
for (const required of ["does not send real email", "does not query live DNS", "not affiliated with Resend"]) {
  if (!readme.toLowerCase().includes(required.toLowerCase())) {
    throw new Error(`README must preserve evidence boundary: ${required}`);
  }
}
console.log("Public evidence boundaries passed.");
