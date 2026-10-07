import { createServerFn } from "@tanstack/react-start";
import type { NearbyPoint } from "@/lib/points";
import { guidedSearchSchema } from "@/lib/guided-search";

export type AssistantAnswer = {
  reply: string;
  points: NearbyPoint[];
  total: number;
  limited: boolean;
  page: number;
};

/** Guided public database search: no language model, geocoder or private records. */
export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const parsed = guidedSearchSchema.safeParse(data);
    if (!parsed.success) throw new Error("Confira os filtros e tente novamente.");
    return parsed.data;
  })
  .handler(async ({ data }): Promise<AssistantAnswer> => {
    const { runGuidedSearch } = await import("@/lib/guided-search.server");
    return runGuidedSearch(data);
  });
