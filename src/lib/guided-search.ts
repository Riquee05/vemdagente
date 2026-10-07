import { z } from "zod";

export const guidedSearchSchema = z
  .object({
    categoryId: z.union([z.uuid(), z.literal("")]).default(""),
    city: z.string().trim().max(100).default(""),
    neighborhood: z.string().trim().max(100).default(""),
    location: z
      .object({
        lat: z.number().finite().min(-25.35).max(-19.75),
        lng: z.number().finite().min(-53.2).max(-44),
        radiusKm: z.number().min(1).max(60),
      })
      .nullable()
      .default(null),
    page: z.number().int().min(1).max(10000).default(1),
  })
  .refine((data) => !data.location || (!data.city && !data.neighborhood), {
    message: "Escolha a busca por cidade e bairro ou por localização atual.",
  });

export type GuidedSearch = z.infer<typeof guidedSearchSchema>;
export const GUIDED_PAGE_SIZE = 20;
export const NEARBY_LIMIT = 60;
export function literalSearch(value: string): string {
  return value.replace(/[%_\\]/g, "").trim();
}
export function guidedSearchReply(total: number, limited: boolean): string {
  if (!total)
    return "Não encontramos instituições publicadas para esses filtros. Experimente outra categoria, retire o bairro ou amplie o raio. A lista ainda pode estar incompleta.";
  return `${limited ? "Mostrando os " : "Encontramos "}${total} ${total === 1 ? "local cadastrado" : "locais cadastrados"}${limited ? " mais próximos" : ""}. Confira endereço e contato nos cartões. Confirme diretamente com a instituição o atendimento, os itens aceitos e o horário antes de ir.`;
}
