export function generateShortId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 11);
}