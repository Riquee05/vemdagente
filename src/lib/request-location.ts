export type RequestLocation = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  postcode: string;
  label: string;
};
/** Não inclui número de imóvel: o ponto selecionado não confirma uma residência. */
export function formatRequestLocation(address: Record<string, string>): RequestLocation | null {
  const street = address["road"] || address["pedestrian"] || "";
  const neighborhood =
    address["suburb"] ||
    address["neighbourhood"] ||
    address["quarter"] ||
    address["city_district"] ||
    "";
  const city =
    address["city"] || address["town"] || address["village"] || address["municipality"] || "";
  const state = address["state"] || "";
  const postcode = address["postcode"] || "";
  const label = [street, neighborhood, city, state, postcode].filter(Boolean).join(" · ");
  return label ? { street, neighborhood, city, state, postcode, label } : null;
}
