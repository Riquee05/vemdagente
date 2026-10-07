import { describe, expect, it } from "vitest";
import { guidedSearchSchema, guidedSearchReply, literalSearch } from "./guided-search";

describe("guided database search", () => {
  it("rejects malformed categories, oversized filters and invalid pagination", () => {
    expect(guidedSearchSchema.safeParse({ categoryId: "not-a-uuid" }).success).toBe(false);
    expect(guidedSearchSchema.safeParse({ city: "a".repeat(101) }).success).toBe(false);
    expect(guidedSearchSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(guidedSearchSchema.safeParse({ page: 1.5 }).success).toBe(false);
  });
  it("rejects conflicting geographic filters and out-of-scope coordinates", () => {
    expect(
      guidedSearchSchema.safeParse({
        city: "Santos",
        location: { lat: -23.55, lng: -46.63, radiusKm: 15 },
      }).success,
    ).toBe(false);
    expect(
      guidedSearchSchema.safeParse({ location: { lat: -12.97, lng: -38.5, radiusKm: 15 } }).success,
    ).toBe(false);
    expect(
      guidedSearchSchema.safeParse({ location: { lat: -23.55, lng: -46.63, radiusKm: 100 } })
        .success,
    ).toBe(false);
    expect(
      guidedSearchSchema.safeParse({ location: { lat: -23.55, lng: -46.63, radiusKm: 15 } })
        .success,
    ).toBe(true);
  });
  it("allows statewide browsing and treats user wildcard characters literally", () => {
    expect(guidedSearchSchema.parse({}).page).toBe(1);
    expect(literalSearch(" %Inter_lagos\\ ")).toBe("Interlagos");
  });
  it("does not promise availability and discloses a bounded nearby result", () => {
    expect(guidedSearchReply(60, true)).toContain("mais próximos");
    expect(guidedSearchReply(1, false)).toContain("1 local cadastrado");
    expect(guidedSearchReply(1, false)).toContain("Confirme diretamente");
    expect(guidedSearchReply(0, false)).toContain("lista ainda pode estar incompleta");
  });
});
