import { z } from "zod";
import { saoPauloToday } from "@/lib/need-validity";
export const institutionPatchSchema = z
  .object({
    name: z.string().trim().min(3).max(160),
    phone: z.string().trim().max(40),
    whatsapp: z.string().trim().max(40),
    website: z
      .string()
      .trim()
      .max(300)
      .refine((value) => !value || /^https?:\/\//i.test(value), "Use um endereço http ou https."),
    opening_hours: z.string().trim().max(300),
    donation_hours: z.string().trim().max(300),
    description: z.string().trim().max(500),
  })
  .strict();
export const institutionProposalSchema = z
  .object({
    point_id: z.uuid(),
    baseline_updated_at: z.iso.datetime({ offset: true }),
    patch: institutionPatchSchema,
  })
  .strict();
export const feedbackKinds = [
  ["phone", "Telefone não funciona"],
  ["item", "Não recebe mais este item"],
  ["hours", "Horário diferente"],
  ["closed", "Local fechado ou mudou de endereço"],
  ["other", "Outra informação para conferir"],
] as const;
export const feedbackSchema = z
  .object({
    point_id: z.uuid(),
    kind: z.enum(["phone", "item", "hours", "closed", "other"]),
    message: z.string().trim().min(5).max(1000),
    contact: z.string().trim().max(200),
    website: z.literal(""),
  })
  .strict();
export const campaignSchema = z
  .object({
    point_id: z.uuid(),
    category_id: z.uuid(),
    title: z.string().trim().min(3).max(120),
    target: z.number().int().positive().max(1000000),
    received: z.number().int().min(0).max(1000000),
    unit: z.string().trim().min(1).max(30),
    expires_at: z.iso.date(),
  })
  .refine((data) => data.received <= data.target, "A quantidade recebida não pode superar a meta.")
  .refine((data) => data.expires_at >= saoPauloToday(), "Escolha um prazo a partir de hoje.");
export function campaignPercent(received: number, target: number): number {
  return target > 0 ? Math.max(0, Math.min(100, Math.round((received / target) * 100))) : 0;
}

export function readInstitutionProposal(message: string) {
  try {
    return z
      .object({
        type: z.literal("institution_update_v1"),
        baseline_updated_at: z.iso.datetime({ offset: true }),
        patch: institutionPatchSchema,
      })
      .strict()
      .parse(JSON.parse(message));
  } catch {
    return null;
  }
}
