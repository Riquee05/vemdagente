import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Retorna apenas vínculos de pontos publicados em SP, sem depender de políticas administrativas. */
export const listPublicPointCauseIds = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ causeIds: z.array(z.string().uuid()).min(1).max(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { readPublicPointCauseIds } = await import("./public-point-causes.server");
    return readPublicPointCauseIds(data.causeIds);
  });
