import { z } from "zod";
export const deliveryFields = [
  ["drop_off", "Recebe entrega no local"],
  ["pickup", "Retira a doação com o doador"],
  ["appointment", "Exige agendamento"],
] as const;
export type DeliveryField = (typeof deliveryFields)[number][0];
export const emptyDelivery = {
  drop_off: "unknown",
  pickup: "unknown",
  appointment: "unknown",
} as const;
const answer = z.enum(["yes", "no", "unknown"]);
export const deliverySchema = z.object({
  point_id: z.uuid(),
  drop_off: answer,
  pickup: answer,
  appointment: answer,
  confirmed: z.literal(true),
});
export function donationChecklist(labels: string[]) {
  const items = [
    "Confirme diretamente se a instituição recebe sua doação atualmente.",
    "Confirme os itens e quantidades aceitos e o horário de recebimento.",
    "Combine a entrega ou retirada e pergunte se é necessário agendar.",
  ];
  const text = labels
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/alimento|comida/.test(text))
    items.push("Confira validade, embalagem intacta e orientações de conservação.");
  if (/roupa|calcado|agasalho/.test(text))
    items.push("Separe roupas limpas, secas e em boas condições de uso.");
  if (/movel|mobilia|eletro/.test(text))
    items.push("Informe medidas, estado e funcionamento; combine o transporte antes de sair.");
  if (/higiene|limpeza/.test(text))
    items.push(
      "Confira a validade e prefira embalagens fechadas, conforme orientação da instituição.",
    );
  items.push(
    "Informe qualquer necessidade de acessibilidade para combinar um atendimento adequado.",
  );
  return items;
}
export type DuplicatePoint = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string;
  description: string | null;
};
export function duplicateGroups(points: DuplicatePoint[]) {
  const keys = new Map<string, DuplicatePoint[]>();
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  for (const point of points) {
    const phone = (point.phone || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    const cnpj = point.description
      ?.match(/CNPJ\s*:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i)?.[1]
      ?.replace(/\D/g, "");
    const candidates = [
      phone.length >= 10 ? `Telefone: ${phone}` : "",
      cnpj ? `CNPJ: ${cnpj}` : "",
      point.address && normalize(point.address).length > 8
        ? `Endereço: ${normalize(point.city)}:${normalize(point.address)}`
        : "",
    ];
    for (const key of candidates.filter(Boolean)) keys.set(key, [...(keys.get(key) || []), point]);
  }
  return [...keys]
    .filter(([, group]) => group.length > 1)
    .map(([reason, points]) => ({ reason, points }));
}
