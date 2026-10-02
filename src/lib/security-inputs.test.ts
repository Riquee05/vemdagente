import { describe, expect, it } from "vitest";

import {
  assistantRequestSchema,
  helpRequestSchema,
  volunteerApplicationSchema,
} from "@/lib/public-submission-schemas";
import { assertRateLimitAllowed, RateLimitError, readPositiveInteger } from "@/lib/rate-limit";

const volunteer = {
  full_name: "  Maria   da Silva  ",
  email: "maria@example.com",
  phone: "  (11) 99999-9999 ",
  city: " São Paulo ",
  state: "sp",
  areas: ["curadoria"],
  motivation: " Quero ajudar na organização. ",
  website: "",
};

describe("envios públicos", () => {
  it("normaliza e valida uma inscrição de voluntariado", () => {
    const parsed = volunteerApplicationSchema.parse(volunteer);
    expect(parsed.full_name).toBe("Maria da Silva");
    expect(parsed.state).toBe("SP");
  });

  it("bloqueia honeypot e campos administrativos", () => {
    expect(volunteerApplicationSchema.safeParse({ ...volunteer, website: "bot.example" }).success).toBe(false);
    expect(volunteerApplicationSchema.safeParse({ ...volunteer, status: "approved" }).success).toBe(false);
  });

  it("valida pedidos de ajuda e seus limites", () => {
    const valid = helpRequestSchema.safeParse({
      category_id: "11111111-1111-4111-8111-111111111111",
      city: " São   Paulo ", lat: -23.55, lng: -46.63,
      note: " Preciso de roupas. ", website: "",
    });
    expect(valid.success).toBe(true);
    expect(helpRequestSchema.safeParse({
      category_id: "11111111-1111-4111-8111-111111111111",
      city: "São Paulo", lat: -23.55, note: "x".repeat(1001), website: "",
    }).success).toBe(false);
  });

  it("mantém os limites de entrada do assistente", () => {
    expect(assistantRequestSchema.safeParse({ message: "Onde posso doar?", history: [] }).success).toBe(true);
    expect(assistantRequestSchema.safeParse({ message: "x".repeat(601), history: [] }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ message: "Onde?", history: Array(11).fill({ role: "user", content: "oi" }) }).success).toBe(false);
  });
});

describe("limitação de abuso", () => {
  it("bloqueia quando o armazenamento informa limite excedido", () => {
    expect(() => assertRateLimitAllowed(false)).toThrow(RateLimitError);
    expect(() => assertRateLimitAllowed(true)).not.toThrow();
  });

  it("usa somente configurações inteiras positivas", () => {
    expect(readPositiveInteger("12", 5)).toBe(12);
    expect(readPositiveInteger("0", 5)).toBe(5);
    expect(readPositiveInteger("inválido", 5)).toBe(5);
  });
});
