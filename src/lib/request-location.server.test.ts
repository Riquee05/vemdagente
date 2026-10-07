import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: mocks.rpc } }));
import { reverseRequestLocation } from "./request-location.server";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("consulta administrativa de região", () => {
  it("limita globalmente, envia apenas coordenadas aproximadas e reutiliza cache", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ address: { road: "Rua teste", suburb: "Bairro", city: "São Paulo" } }),
      });
    vi.stubGlobal("fetch", fetch);
    const first = await reverseRequestLocation(-23.7091485, -46.6901856);
    const second = await reverseRequestLocation(-23.7091485, -46.6901856);
    expect(first?.label).toBe("Rua teste · Bairro · São Paulo");
    expect(second).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = fetch.mock.calls[0]![0] as URL;
    expect(url.searchParams.get("lat")).toBe("-23.7091");
    expect(url.searchParams.get("lon")).toBe("-46.6902");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "consume_request_rate_limit",
      expect.objectContaining({ p_limit: 1, p_window_seconds: 2 }),
    );
  });
  it("não acessa o provedor se o limite compartilhado negar", async () => {
    vi.useFakeTimers();
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = expect(reverseRequestLocation(-23.6, -46.7)).rejects.toThrow("Aguarde");
    await vi.runAllTimersAsync();
    await result;
    expect(fetch).not.toHaveBeenCalled();
  });
});
