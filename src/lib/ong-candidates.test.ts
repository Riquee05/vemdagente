import { describe, expect, it } from "vitest";
import { ongCandidates, validateOngLocation, type GeocodedAddress } from "./ong-candidates";
const address = (overrides: Partial<GeocodedAddress> = {}): GeocodedAddress => ({
  geometry: { location: { lat: -23.6, lng: -46.7 } },
  address_components: [
    { long_name: "Brasil", short_name: "BR", types: ["country"] },
    { long_name: "São Paulo", short_name: "SP", types: ["administrative_area_level_1"] },
    { long_name: "São Paulo", short_name: "São Paulo", types: ["administrative_area_level_2"] },
    { long_name: "04621-003", short_name: "04621-003", types: ["postal_code"] },
    { long_name: "513", short_name: "513", types: ["street_number"] },
  ],
  ...overrides,
});
describe("lote oficial de instituições", () => {
  it("possui 100 CNPJs únicos, endereços e CEPs da capital", () => {
    expect(ongCandidates).toHaveLength(100);
    expect(new Set(ongCandidates.map((item) => item.cnpj)).size).toBe(100);
    for (const item of ongCandidates) {
      expect(item.city).toBe("São Paulo");
      expect(item.state).toBe("SP");
      expect(item.postalCode).toMatch(/^\d{8}$/);
      expect(item.address.length).toBeGreaterThan(5);
    }
  });
  it("aceita localização completa do CEP informado", () => {
    expect(validateOngLocation(address(), "04621003", "513")).toEqual({ lat: -23.6, lng: -46.7 });
  });
  it("recusa localização parcial, CEP errado, outra cidade e coordenadas inválidas", () => {
    expect(() =>
      validateOngLocation(address({ partial_match: true }), "04621003", "513"),
    ).toThrow();
    expect(() => validateOngLocation(address(), "00000000", "513")).toThrow();
    expect(() => validateOngLocation(address(), "04621003", "999")).toThrow();
    const otherCity = address();
    otherCity.address_components![2]!.long_name = "Santos";
    expect(() => validateOngLocation(otherCity, "04621003", "513")).toThrow();
    expect(() =>
      validateOngLocation(
        address({ geometry: { location: { lat: NaN, lng: -46.7 } } }),
        "04621003",
        "513",
      ),
    ).toThrow();
    expect(() => validateOngLocation(undefined, "04621003", "513")).toThrow();
  });
});
