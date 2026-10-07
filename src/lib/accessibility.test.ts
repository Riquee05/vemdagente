import { describe, expect, it } from "vitest";
import { accessibilitySchema, emptyAccessibility } from "./accessibility";
describe("confirmação de acessibilidade", () => {
  const valid = {
    ...emptyAccessibility,
    point_id: "11111111-1111-4111-8111-111111111111",
    confirmed: true,
    step_free_entrance: "yes",
  };
  it("não transforma ausência de informação em acessibilidade", () => {
    expect(Object.values(emptyAccessibility).every((value) => value === "unknown")).toBe(true);
    expect(accessibilitySchema.safeParse({ ...valid, ...emptyAccessibility }).success).toBe(false);
  });
  it("exige confirmação explícita e valores definidos", () => {
    expect(accessibilitySchema.safeParse(valid).success).toBe(true);
    expect(accessibilitySchema.safeParse({ ...valid, confirmed: false }).success).toBe(false);
    expect(accessibilitySchema.safeParse({ ...valid, wheelchair_access: "maybe" }).success).toBe(
      false,
    );
  });
  it("não aceita identidade de revisor ou data do cliente", () => {
    expect(
      accessibilitySchema.parse({ ...valid, confirmed_by: "fake", confirmed_at: "fake" }),
    ).not.toHaveProperty("confirmed_by");
  });
});
