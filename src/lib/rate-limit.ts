export type RateLimitScope = "help_request" | "volunteer_application" | "assistant_question";

export type RateLimitConfig = { limit: number; windowSeconds: number };

export class RateLimitError extends Error {
  readonly statusCode = 429;

  constructor() {
    super("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.");
    this.name = "RateLimitError";
  }
}

export function assertRateLimitAllowed(allowed: boolean): void {
  if (!allowed) throw new RateLimitError();
}

export function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
