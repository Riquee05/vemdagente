import { z } from "zod";
export const testimonialSchema = z.object({
  display_name: z.string().trim().min(2).max(60),
  city: z.string().trim().max(80).optional(),
  rating: z.number().int().min(1).max(5),
  story: z.string().trim().min(30).max(2000),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
export const institutionClaimSchema = z.object({
  point_id: z.string().uuid(),
  contact: z.string().trim().min(5).max(200),
  message: z.string().trim().min(20).max(1000),
});
