import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const helpStatusLabels = {
  open: "Em aberto",
  resolved: "Resolvido",
  closed: "Encerrado",
} as const;
const statusSchema = z.enum(["open", "resolved", "closed"]);

export const listAdminHelpRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        page: z.number().int().min(1).max(100000),
        status: z.union([statusSchema, z.literal("all")]),
      })
      .parse(input),
  )
  .handler(async (input) => {
    const { readHelpRequests } = await import("./admin-help-requests.server");
    return readHelpRequests(input);
  });

export const updateAdminHelpRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), status: statusSchema, previousStatus: statusSchema })
      .parse(input),
  )
  .handler(async (input) => {
    const { changeHelpRequest } = await import("./admin-help-requests.server");
    return changeHelpRequest(input);
  });

export const locateAdminHelpRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async (input) => {
    const { readHelpRequestLocation } = await import("./admin-help-requests.server");
    return readHelpRequestLocation(input);
  });
