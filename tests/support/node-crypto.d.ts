declare module "node:crypto" {
  export function createHmac(algorithm: string, key: string): {
    update(data: string): { digest(encoding: "hex"): string };
  };
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
  export function randomUUID(): string;
}
