import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), ilike: vi.fn(), order: vi.fn(), range: vi.fn() };
  for (const method of ["select", "eq", "ilike", "order"] as const)
    query[method].mockImplementation(() => query);
  return { query, from: vi.fn(() => query), rpc: vi.fn(), createClient: vi.fn(), rate: vi.fn() };
});
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/rate-limit.server", () => ({
  enforceRateLimit: mocks.rate,
  rateLimitConfig: () => ({ limit: 20, windowSeconds: 600 }),
}));
import { runGuidedSearch } from "./guided-search.server";
import { guidedSearchSchema } from "./guided-search";
const askAssistant = (args: { data: unknown }) =>
  runGuidedSearch(guidedSearchSchema.parse(args.data));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "public-test-key");
  mocks.createClient.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
  mocks.query.range.mockResolvedValue({ data: [], count: 0, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("guided search server boundaries", () => {
  it("filters public SP records and categories before database pagination", async () => {
    const categoryId = "11111111-1111-4111-8111-111111111111";
    await askAssistant({
      data: {
        categoryId,
        city: "São Paulo",
        neighborhood: "%Interlagos_",
        location: null,
        page: 2,
      },
    });
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "public-test-key",
      { auth: { persistSession: false } },
    );
    expect(mocks.query.select).toHaveBeenCalledWith(
      expect.stringContaining("point_accepted_items!inner"),
      { count: "exact" },
    );
    expect(mocks.query.eq).toHaveBeenCalledWith("is_active", true);
    expect(mocks.query.eq).toHaveBeenCalledWith("curation_status", "verified");
    expect(mocks.query.eq).toHaveBeenCalledWith("state", "SP");
    expect(mocks.query.eq).toHaveBeenCalledWith("point_accepted_items.category_id", categoryId);
    expect(mocks.query.ilike).toHaveBeenCalledWith("address", "%Interlagos%");
    expect(mocks.query.range).toHaveBeenCalledWith(20, 39);
    expect(mocks.rate).toHaveBeenCalled();
  });
  it("uses existing nearby RPC and labels its result cap honestly", async () => {
    mocks.rpc.mockResolvedValue({
      data: Array.from({ length: 60 }, (_, i) => ({
        id: String(i),
        name: `Ponto ${i}`,
        state: "SP",
      })),
      error: null,
    });
    const result = await askAssistant({
      data: {
        categoryId: "",
        city: "",
        neighborhood: "",
        location: { lat: -23.55, lng: -46.63, radiusKm: 15 },
        page: 2,
      },
    });
    expect(mocks.rpc).toHaveBeenCalledWith("search_nearby_points", {
      p_lat: -23.55,
      p_lng: -46.63,
      p_radius_km: 15,
      p_limit: 60,
    });
    expect(result.limited).toBe(true);
    expect(result.points).toHaveLength(20);
    expect(result.points[0]?.id).toBe("20");
  });
  it("does not disguise database failure as an empty search", async () => {
    mocks.query.range.mockResolvedValue({
      data: null,
      count: null,
      error: { message: "database unavailable" },
    });
    await expect(
      askAssistant({
        data: { categoryId: "", city: "", neighborhood: "", location: null, page: 1 },
      }),
    ).rejects.toThrow("Não foi possível consultar");
  });
});
