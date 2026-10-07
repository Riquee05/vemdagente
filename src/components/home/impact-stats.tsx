import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

async function countPublishedPoints(): Promise<number> {
  const { count, error } = await supabase
    .from("collection_points")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("curation_status", "verified")
    .eq("state", "SP");
  if (error) throw error;
  return count ?? 0;
}

/** Números reais do projeto para a página inicial. */
export function ImpactStats() {
  const points = useQuery({ queryKey: ["home-points-count"], queryFn: countPublishedPoints });

  const stats = [
    {
      value: points.data != null ? `+${points.data}` : "…",
      label: "locais publicados no mapa de São Paulo",
    },
    { value: "SP", label: "busca de locais publicados no estado de São Paulo" },
    { value: "100%", label: "comunitário, sem intermediar dinheiro ou entregas" },
  ];

  return (
    <section className="border-y-2 border-foreground bg-foreground text-background">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="font-display text-5xl text-primary">{stat.value}</div>
            <p className="mt-2 text-base opacity-85">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
