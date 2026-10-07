import { z } from "zod";
export const accessibilityFields = [
  ["step_free_entrance", "Entrada sem degraus ou com rampa"],
  ["wheelchair_access", "Acesso para cadeira de rodas"],
  ["accessible_toilet", "Banheiro acessível"],
  ["libras_service", "Atendimento em Libras"],
  ["message_arrangement", "Entrega ou atendimento combinado por mensagem"],
] as const;
export type AccessibilityField = (typeof accessibilityFields)[number][0];
export type AccessibilityValue = "yes" | "no" | "unknown";
export const accessibilityLabels = { yes: "Sim", no: "Não", unknown: "Não informado" } as const;
export const emptyAccessibility: Record<AccessibilityField, AccessibilityValue> = {
  step_free_entrance: "unknown",
  wheelchair_access: "unknown",
  accessible_toilet: "unknown",
  libras_service: "unknown",
  message_arrangement: "unknown",
};
const value = z.enum(["yes", "no", "unknown"]);
export const accessibilitySchema = z
  .object({
    point_id: z.string().uuid(),
    step_free_entrance: value,
    wheelchair_access: value,
    accessible_toilet: value,
    libras_service: value,
    message_arrangement: value,
    confirmed: z.literal(true),
  })
  .refine((data) => accessibilityFields.some(([field]) => data[field] !== "unknown"), {
    message: "Informe ao menos um item confirmado.",
  });
