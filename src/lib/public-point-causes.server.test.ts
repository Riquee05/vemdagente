import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => {
  const calls: unknown[][] = [];
  const result = {
    data: [{ point_id: "published-id" }, { point_id: "published-id" }],
    error: null as Error | null,
  };
  const query: any = {};
  for (const method of ["select", "in", "eq", "limit"])
    query[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return query;
    };
  query.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return { calls, result, from: vi.fn(() => query) };
});
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
import { readPublicPointCauseIds } from "./public-point-causes.server";
beforeEach(() => {
  mocks.calls.length = 0;
  mocks.result.error = null;
});
describe("vínculos públicos de causas", () => {
  it("exige ponto ativo publicado em SP e retorna apenas IDs únicos", async () => {
    expect(await readPublicPointCauseIds(["cause-id"])).toEqual(["published-id"]);
    for (const pair of [
      ["collection_points.is_active", true],
      ["collection_points.curation_status", "verified"],
      ["collection_points.state", "SP"],
    ])
      expect(mocks.calls).toContainEqual(["eq", ...pair]);
    expect(mocks.calls).toContainEqual(["in", "cause_id", ["cause-id"]]);
  });
  it("propaga erro sem disfarçar a falha como zero resultados", async () => {
    mocks.result.error = new Error("permission denied");
    await expect(readPublicPointCauseIds(["cause-id"])).rejects.toThrow(
      "Não foi possível carregar",
    );
  });
});
