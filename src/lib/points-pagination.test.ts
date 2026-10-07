import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, calls, result } = vi.hoisted(() => {
  const calls: { method: string; args: unknown[] }[] = [];
  const result: { data: unknown[] | null; count: number; error: Error | null } = {
    data: [],
    count: 0,
    error: null,
  };
  const chain = {
    select: (...args: unknown[]) => {
      calls.push({ method: "select", args });
      return chain;
    },
    eq: (...args: unknown[]) => {
      calls.push({ method: "eq", args });
      return chain;
    },
    ilike: (...args: unknown[]) => {
      calls.push({ method: "ilike", args });
      return chain;
    },
    order: (...args: unknown[]) => {
      calls.push({ method: "order", args });
      return chain;
    },
    range: (...args: unknown[]) => {
      calls.push({ method: "range", args });
      return chain;
    },
    abortSignal: (...args: unknown[]) => {
      calls.push({ method: "abortSignal", args });
      return chain;
    },
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return { calls, result, from: vi.fn(() => chain) };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { fetchVerifiedPointsPage } from "./points";

beforeEach(() => {
  calls.length = 0;
  result.data = [];
  result.count = 0;
  result.error = null;
});
describe("busca pública paginada", () => {
  it("consulta somente a página solicitada com ordenação estável e escopo público", async () => {
    result.count = 80;
    const page = await fetchVerifiedPointsPage({ city: "", causeId: "all", page: 2 });
    expect(page.total).toBe(80);
    expect(calls).toContainEqual({ method: "range", args: [30, 59] });
    for (const args of [
      ["state", "SP"],
      ["is_active", true],
      ["curation_status", "verified"],
    ]) {
      expect(calls).toContainEqual({ method: "eq", args });
    }
    expect(calls.filter((call) => call.method === "order").map((call) => call.args)).toEqual([
      ["name"],
      ["id"],
    ]);
  });
  it("aplica causa no banco e trata caracteres de busca como texto", async () => {
    await fetchVerifiedPointsPage({ city: "  São%_Paulo  ", causeId: "cause-id", page: 1 });
    expect(calls).toContainEqual({ method: "eq", args: ["point_causes.cause_id", "cause-id"] });
    expect(calls).toContainEqual({ method: "ilike", args: ["city", "%SãoPaulo%"] });
    expect(String(calls.find((call) => call.method === "select")?.args[0])).toContain(
      "point_causes!inner",
    );
  });
  it("propaga falha do banco para não mostrar um falso resultado vazio", async () => {
    result.error = new Error("indisponível");
    await expect(fetchVerifiedPointsPage({ city: "", causeId: "all", page: 1 })).rejects.toThrow(
      "indisponível",
    );
  });
  it("encaminha cancelamento de uma busca substituída", async () => {
    const signal = new AbortController().signal;
    await fetchVerifiedPointsPage({ city: "", causeId: "all", page: 1, signal });
    expect(calls).toContainEqual({ method: "abortSignal", args: [signal] });
  });
});
