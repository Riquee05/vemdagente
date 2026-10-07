import { describe, expect, it } from "vitest";
import { deliverySchema, donationChecklist, duplicateGroups } from "./donation-planning";
describe("Planejamento de doações", () => {
  it("adapta orientação para alimentos e roupas", () => {
    expect(donationChecklist(["Alimentos", "Roupas"])).toEqual(
      expect.arrayContaining([
        expect.stringContaining("validade"),
        expect.stringContaining("roupas limpas"),
      ]),
    );
  });
  it("exige confirmação e preserva desconhecido", () => {
    const data = {
      point_id: "11111111-1111-4111-8111-111111111111",
      drop_off: "unknown",
      pickup: "no",
      appointment: "yes",
      confirmed: true,
    };
    expect(deliverySchema.parse(data).drop_off).toBe("unknown");
    expect(deliverySchema.safeParse({ ...data, confirmed: false }).success).toBe(false);
  });
  it("normaliza telefone com país e endereço acentuado", () => {
    const point = {
      id: "a",
      name: "Um",
      phone: "(11) 99999-1234",
      address: "Rua São João, 10",
      city: "São Paulo",
      description: null,
    };
    const other = { ...point, id: "b", phone: "+55 11 99999-1234", address: "Rua Sao Joao 10" };
    expect(duplicateGroups([point, other])).toHaveLength(2);
  });
  it("não agrupa contatos ausentes nem endereços em cidades diferentes", () => {
    const point = {
      id: "a",
      name: "Um",
      phone: null,
      address: "Rua Um 123",
      city: "São Paulo",
      description: null,
    };
    expect(duplicateGroups([point, { ...point, id: "b", city: "Santos" }])).toEqual([]);
  });
  it("identifica CNPJ informado na descrição", () => {
    const point = {
      id: "a",
      name: "Um",
      phone: null,
      address: null,
      city: "São Paulo",
      description: "CNPJ: 12.345.678/0001-90",
    };
    expect(duplicateGroups([point, { ...point, id: "b" }])[0]?.reason).toBe("CNPJ: 12345678000190");
  });
});
