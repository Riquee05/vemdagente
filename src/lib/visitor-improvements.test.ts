import { describe, expect, it } from "vitest";
import { institutionShareText, parseFavorites } from "./favorites";
import { pointReviewReason } from "./point-freshness";

describe("local favorites and sharing", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  it("rejects corrupted storage and arbitrary values", () => {
    expect(parseFavorites("not json")).toEqual([]);
    expect(parseFavorites(JSON.stringify({ id }))).toEqual([]);
    expect(parseFavorites(JSON.stringify([id, id, null, "unsafe-id"]))).toEqual([id]);
  });
  it("bounds the saved list", () => {
    const ids = Array.from(
      { length: 250 },
      (_, index) => `${index.toString(16).padStart(8, "0")}-1111-4111-8111-111111111111`,
    );
    expect(parseFavorites(JSON.stringify(ids))).toHaveLength(200);
  });
  it("shares the published detail link with no donor data", () => {
    const text = institutionShareText(
      { id, name: "Instituição", address: null, city: "São Paulo" },
      "https://vemdagente.lovable.app",
    );
    expect(text).toContain(`https://vemdagente.lovable.app/pontos/${id}`);
    expect(text).toContain("Confirme diretamente");
  });
});
describe("review warnings", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  it("flags missing, invalid, stale and explicitly questioned confirmations", () => {
    expect(pointReviewReason({ confirmed_at: null }, now)).toContain("sem confirmação");
    expect(pointReviewReason({ confirmed_at: "bad" }, now)).toContain("sem confirmação");
    expect(pointReviewReason({ confirmed_at: "2026-01-01" }, now)).toContain("90 dias");
    expect(
      pointReviewReason({ confirmation_status: "needs_update", confirmed_at: "2026-10-07" }, now),
    ).toContain("atualização");
    expect(pointReviewReason({ confirmed_at: "2026-10-01" }, now)).toBeNull();
  });
});
