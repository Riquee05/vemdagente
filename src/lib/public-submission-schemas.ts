import { z } from "zod";

const collapseSpaces = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

const normalizedRequired = (minimum: number, maximum: number, message: string) =>
  z.preprocess(collapseSpaces, z.string().min(minimum, message).max(maximum));

const normalizedOptional = (maximum: number) =>
  z
    .preprocess(collapseSpaces, z.string().max(maximum).optional())
    .transform((value) => (value ? value : undefined));

const honeypot = z
  .preprocess(collapseSpaces, z.string().max(200).optional())
  .refine((value) => !value, "Não foi possível enviar. Tente novamente.");

export const volunteerAreaOptions = [
  "verificacao-pontos",
  "curadoria",
  "divulgacao",
  "suporte-usuarios",
  "tech",
  "design",
  "traducao",
  "outro",
] as const;

export const volunteerApplicationSchema = z
  .object({
    full_name: normalizedRequired(2, 120, "Informe seu nome completo."),
    email: z.preprocess(collapseSpaces, z.string().email("Informe um e-mail válido.").max(255)),
    phone: normalizedOptional(40),
    city: normalizedOptional(80),
    state: z
      .preprocess(
        (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
        z
          .string()
          .regex(/^$|^[A-Z]{2}$/, "Informe um estado válido.")
          .max(2)
          .optional(),
      )
      .transform((value) => (value ? value : undefined)),
    areas: z.array(z.enum(volunteerAreaOptions)).min(1).max(volunteerAreaOptions.length),
    availability: normalizedOptional(500),
    experience: normalizedOptional(1000),
    motivation: normalizedRequired(2, 1000, "Conte por que deseja ajudar."),
    heard_from: normalizedOptional(255),
    website: honeypot,
  })
  .strict();

export const helpRequestSchema = z
  .object({
    category_id: z.string().uuid("Escolha um tipo de ajuda válido."),
    city: normalizedRequired(2, 120, "Informe sua cidade."),
    lat: z.number().min(-25.5).max(-19.5).nullable().optional(),
    lng: z.number().min(-53.5).max(-44).nullable().optional(),
    note: normalizedOptional(1000),
    website: honeypot,
  })
  .strict()
  .refine((data) => (data.lat == null) === (data.lng == null), {
    message: "Localização inválida.",
  });

export const assistantRequestSchema = z
  .object({
    message: normalizedRequired(2, 600, "Escreva uma pergunta válida."),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: normalizedRequired(1, 2000, "Histórico inválido."),
        }),
      )
      .max(10)
      .optional(),
  })
  .strict();
