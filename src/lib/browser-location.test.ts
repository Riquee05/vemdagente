import { afterEach, describe, expect, it, vi } from "vitest";
import { getBrowserLocation } from "./geocode";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function stub(
  fn: (success: (position: unknown) => void, error: (error: { code: number }) => void) => void,
) {
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: fn } });
}
describe("localização compartilhada", () => {
  it("aceita coordenadas válidas de São Paulo", async () => {
    stub((success) => success({ coords: { latitude: -23.55, longitude: -46.63 } }));
    await expect(getBrowserLocation()).resolves.toEqual({ lat: -23.55, lng: -46.63 });
  });
  it("não repassa coordenadas inválidas ao mapa", async () => {
    stub((success) => success({ coords: { latitude: NaN, longitude: -46 } }));
    await expect(getBrowserLocation()).rejects.toThrow("localização inválida");
  });
  it("trata resposta incompleta sem lançar erro fora da Promise", async () => {
    stub((success) => success({}));
    await expect(getBrowserLocation()).rejects.toThrow("ler a localização");
  });
  it("mantém busca manual quando a permissão é negada", async () => {
    stub((_, error) => error({ code: 1 }));
    await expect(getBrowserLocation()).rejects.toThrow("CEP, cidade ou bairro");
  });
  it("trata falha síncrona do navegador", async () => {
    stub(() => {
      throw new Error("SecurityError");
    });
    await expect(getBrowserLocation()).rejects.toThrow("iniciar a localização");
  });
  it("encerra espera quando o navegador não chama nenhum callback", async () => {
    vi.useFakeTimers();
    stub(() => {});
    const result = expect(getBrowserLocation()).rejects.toThrow("demorou");
    await vi.advanceTimersByTimeAsync(12000);
    await result;
  });
  it("recusa localização fora da área em todas as telas", async () => {
    stub((success) => success({ coords: { latitude: 40, longitude: -73 } }));
    await expect(getBrowserLocation()).rejects.toThrow("fora da área");
  });
});
