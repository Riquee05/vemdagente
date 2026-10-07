export function saoPauloToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function isNeedCurrent(expiresAt: string | null, today = saoPauloToday()): boolean {
  return expiresAt === null || expiresAt >= today;
}
