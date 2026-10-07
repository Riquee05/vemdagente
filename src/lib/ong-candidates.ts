import candidates from "@/data/ongs-capital.json";

export const ONG_SOURCE_URL =
  "https://dadosabertos.sp.gov.br/dataset/pro-social-organizacoes-sociais-parceiras";
export const ONG_SOURCE_DATE = "14/04/2025";
export const ongCandidates = candidates;
export const normalizeOngText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export type GeocodedAddress = {
  partial_match?: boolean;
  geometry?: { location?: { lat: number; lng: number } };
  address_components?: { long_name: string; short_name: string; types: string[] }[];
};

export function validateOngLocation(
  result: GeocodedAddress | undefined,
  postalCode: string,
  streetNumber: string,
) {
  const components = result?.address_components ?? [];
  const component = (type: string) => components.find((item) => item.types.includes(type));
  const city = component("administrative_area_level_2") ?? component("locality");
  const location = result?.geometry?.location;
  if (
    !result ||
    result.partial_match ||
    !location ||
    !Number.isFinite(location.lat) ||
    !Number.isFinite(location.lng) ||
    location.lat < -24.1 ||
    location.lat > -23.3 ||
    location.lng < -47 ||
    location.lng > -46.3 ||
    component("country")?.short_name !== "BR" ||
    component("administrative_area_level_1")?.short_name !== "SP" ||
    normalizeOngText(city?.long_name ?? "") !== "sao paulo" ||
    component("postal_code")?.long_name.replace(/\D/g, "") !== postalCode ||
    component("street_number")?.long_name !== streetNumber
  )
    throw new Error("Endereço não localizado com precisão. Revise antes de cadastrar.");
  return location;
}
