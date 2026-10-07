import { describe, expect, it } from "vitest";
import { groupMapPoints, SATELLITE_URL, SATELLITE_ATTRIBUTION } from "./map-layers";
const points = [
  { id: "a", name: "A", lat: -23.55, lng: -46.63 },
  { id: "b", name: "B", lat: -23.55, lng: -46.63 },
];
describe("mapa sem chave", () => {
  it("agrupa locais próximos e mantém o selecionado acessível", () => {
    expect(groupMapPoints(points, 10)).toHaveLength(1);
    expect(groupMapPoints(points, 10, "a")).toHaveLength(2);
    expect(groupMapPoints(points, 17)).toHaveLength(2);
  });
  it("ignora coordenadas inválidas sem perder pontos válidos", () => {
    const invalid = [
      { id: "c", name: "C", lat: NaN, lng: 0 },
      { id: "d", name: "D", lat: 100, lng: 0 },
    ];
    expect(groupMapPoints([...points, ...invalid], 17)).toHaveLength(2);
  });
  it("usa endpoint HTTPS e atribuição correspondente à imagem de 2025", () => {
    expect(SATELLITE_URL).toContain("https://tiles.maps.eox.at/");
    expect(SATELLITE_URL).toContain("s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg");
    expect(SATELLITE_ATTRIBUTION).toContain("Copernicus Sentinel data 2025");
    expect(SATELLITE_ATTRIBUTION).toContain("CC BY-NC-SA 4.0");
  });
});
