import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export function TerritoryInfo({ pointId }: { pointId: string }) {
  const q = useQuery({
    queryKey: ["public-territory", pointId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_territory")
        .select("district,zone,source,confirmed_at")
        .eq("point_id", pointId)
        .maybeSingle();
      if (error && ["42P01", "PGRST205"].includes(error.code)) return null;
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });
  return (
    <section className="mt-4">
      <h2 className="font-semibold">Classificação territorial</h2>
      {q.isPending ? (
        <p role="status">Consultando região…</p>
      ) : q.isError ? (
        <p role="alert">Não foi possível consultar a região.</p>
      ) : q.data ? (
        <>
          <p>
            Distrito: {q.data.district} · Zona {q.data.zone}
          </p>
          <p className="break-words text-sm">
            Fonte: {q.data.source} · Conferido em{" "}
            {new Date(q.data.confirmed_at).toLocaleDateString("pt-BR")}
          </p>
        </>
      ) : (
        <p>Distrito e zona não informados ou ainda não revisados.</p>
      )}
    </section>
  );
}
