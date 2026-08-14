// Prefixed unique ids for entities created at runtime (as opposed to the
// hand-authored, readable ids in the seed data). Uses the platform Web
// Crypto API, available in both the Node and Edge runtimes Next.js uses
// — no dependency required.
export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
