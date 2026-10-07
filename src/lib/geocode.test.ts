import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupCep } from "./geocode";
afterEach(() => vi.unstubAllGlobals());
const address = {
  logradouro: "Rua Exemplo",
  bairro: "Interlagos",
  localidade: "São Paulo",
  uf: "SP",
};
describe("CEP lookup", () => {
  it("does not report a valid CEP as missing when map lookup fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => address })
        .mockResolvedValueOnce({ ok: true, json: async () => [] }),
    );
    await expect(lookupCep("04800-000")).rejects.toThrow("CEP válido");
  });
  it("rejects CEPs outside SP before geocoding", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ...address, uf: "RJ" }) });
    vi.stubGlobal("fetch", fetch);
    expect(await lookupCep("20000-000")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("locates the street without appending the neighborhood", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => address })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            display_name: "Rua Exemplo",
            lat: "-23.7",
            lon: "-46.7",
            address: { city: "São Paulo", state: "São Paulo" },
          },
        ],
      });
    vi.stubGlobal("fetch", fetch);
    expect(await lookupCep("04800-000")).toMatchObject({ city: "São Paulo", lat: -23.7 });
    expect(new URL(fetch.mock.calls[1]![0]).searchParams.get("q")).toBe(
      "Rua Exemplo, São Paulo, SP, Brasil",
    );
  });
});
