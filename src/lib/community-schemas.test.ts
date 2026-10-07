import { describe, it, expect } from "vitest";
import { testimonialSchema, institutionClaimSchema } from "./community-schemas";
import { isNeedCurrent, saoPauloToday } from "./need-validity";
const valid = {
  display_name: "Henrique",
  rating: 5,
  story: "Encontramos uma instituição perto de casa para entregar nossa doação.",
  consent: true,
};
describe("envio de relatos", () => {
  it("exige autorização explícita e limita texto e avaliação", () => {
    expect(testimonialSchema.safeParse(valid).success).toBe(true);
    for (const patch of [
      { consent: false },
      { rating: 0 },
      { rating: 6 },
      { rating: 2.5 },
      { story: "curto" },
      { story: "x".repeat(2001) },
      { display_name: " " },
      { website: "spam" },
    ])
      expect(testimonialSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it("ignora status e identidade de revisão fornecidos pelo visitante", () => {
    const parsed = testimonialSchema.parse({ ...valid, status: "approved", reviewed_by: "fake" });
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("reviewed_by");
  });
  it("exige instituição válida, contato e descrição do vínculo", () => {
    expect(
      institutionClaimSchema.safeParse({ point_id: "bad", contact: "", message: "" }).success,
    ).toBe(false);
  });
});
describe("prazo das necessidades", () => {
  it("inclui o último dia e esconde necessidades vencidas", () => {
    expect(isNeedCurrent(null, "2026-10-06")).toBe(true);
    expect(isNeedCurrent("2026-10-06", "2026-10-06")).toBe(true);
    expect(isNeedCurrent("2026-10-05", "2026-10-06")).toBe(false);
  });
  it("usa o calendário de São Paulo ao redor da meia-noite UTC", () => {
    expect(saoPauloToday(new Date("2026-10-07T01:00:00Z"))).toBe("2026-10-06");
  });
});
