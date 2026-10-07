import { describe, expect, it } from "vitest";
import { formatRequestLocation } from "./request-location";
describe("localização aproximada do pedido", () => {
  it("mostra rua, bairro, cidade e CEP sem atribuir número residencial", () => {
    expect(
      formatRequestLocation({
        road: "Rua Júlio de Barros",
        suburb: "Jardim Regis",
        city: "São Paulo",
        state: "São Paulo",
        postcode: "04811-200",
        house_number: "123",
      })?.label,
    ).toBe("Rua Júlio de Barros · Jardim Regis · São Paulo · São Paulo · 04811-200");
  });
  it("aceita dados parciais e bairros em campos alternativos", () => {
    expect(
      formatRequestLocation({ neighbourhood: "Interlagos", municipality: "São Paulo" })?.label,
    ).toBe("Interlagos · São Paulo");
    expect(formatRequestLocation({})).toBeNull();
  });
});
