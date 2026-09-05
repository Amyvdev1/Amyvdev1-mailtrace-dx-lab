declare module "node:fs" {
  export function mkdirSync(path: string, options: { recursive: true }): string | undefined;
}
declare module "node:path" {
  export function dirname(path: string): string;
  export function resolve(path: string): string;
}
