import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(),
  };
  return { query, from: vi.fn(() => query) };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
import { fetchVerifiedPointsPage } from "./points";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.range.mockResolvedValue({ data: [], count: 0, error: null });
});
describe("public collection filters", () => {
  it("applies affirmative accessibility and current need predicates before pagination", async () => {
    await fetchVerifiedPointsPage({
      city: "São Paulo",
      causeId: "all",
      page: 2,
      accessibility: "wheelchair_access",
      needsOnly: true,
    });
    expect(mocks.query.select).toHaveBeenCalledWith(
      expect.stringContaining("point_accessibility!inner(wheelchair_access)"),
      { count: "exact" },
    );
    expect(mocks.query.select).toHaveBeenCalledWith(expect.stringContaining("point_needs!inner"), {
      count: "exact",
    });
    expect(mocks.query.eq).toHaveBeenCalledWith("point_accessibility.wheelchair_access", "yes");
    expect(mocks.query.eq).toHaveBeenCalledWith("point_needs.is_active", true);
    expect(mocks.query.eq).toHaveBeenCalledWith("state", "SP");
    expect(mocks.query.eq).toHaveBeenCalledWith("curation_status", "verified");
    expect(mocks.query.or).toHaveBeenCalledWith(expect.stringContaining("expires_at.gte."), {
      referencedTable: "point_needs",
    });
    expect(mocks.query.range).toHaveBeenCalledWith(30, 59);
  });
  it("does not expose the entire directory for an empty favorites list", async () => {
    expect(
      await fetchVerifiedPointsPage({ city: "", causeId: "all", page: 1, favoriteIds: [] }),
    ).toEqual({ points: [], total: 0 });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("preserves all public scope filters when retrieving favorites", async () => {
    const ids = ["11111111-1111-4111-8111-111111111111"];
    await fetchVerifiedPointsPage({ city: "", causeId: "all", page: 1, favoriteIds: ids });
    expect(mocks.query.in).toHaveBeenCalledWith("id", ids);
    expect(mocks.query.eq).toHaveBeenCalledWith("is_active", true);
    expect(mocks.query.eq).toHaveBeenCalledWith("state", "SP");
  });
});
