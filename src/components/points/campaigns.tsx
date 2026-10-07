import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { saoPauloToday } from "@/lib/need-validity";
import { campaignPercent } from "@/lib/institution-workspace";
import { Button } from "@/components/ui/button";
export function Campaigns({ pointId }: { pointId: string }) {
  const campaigns = useQuery({
    queryKey: ["public-campaigns", pointId],
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_needs")
        .select(
          "id,campaign_title,target_quantity,received_quantity,quantity_unit,expires_at,updated_at",
        )
        .eq("point_id", pointId)
        .eq("is_active", true)
        .not("campaign_title", "is", null)
        .gte("expires_at", saoPauloToday());
      if (error && ["42703", "PGRST204"].includes(error.code)) return [];
      if (error) throw new Error("Não foi possível carregar as campanhas.");
      return data ?? [];
    },
  });
  if (campaigns.isError)
    return (
      <div role="alert" className="mt-6">
        Não foi possível consultar campanhas.{" "}
        <Button variant="outline" onClick={() => campaigns.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  if (!campaigns.data?.length) return null;
  return (
    <section className="mt-6 space-y-3">
      <h2 className="text-lg font-semibold">Campanhas em andamento</h2>
      {campaigns.data.map((campaign) => (
        <article key={campaign.id} className="rounded border border-border p-4">
          <h3 className="font-semibold">{campaign.campaign_title}</h3>
          <p>
            {campaign.received_quantity} de {campaign.target_quantity} {campaign.quantity_unit}
          </p>
          <progress
            className="mt-2 w-full"
            max={100}
            value={campaignPercent(campaign.received_quantity, campaign.target_quantity ?? 0)}
            aria-label={`Andamento de ${campaign.campaign_title}`}
          />
          <p className="text-sm">
            Até {campaign.expires_at?.split("-").reverse().join("/")}. Atualizado em{" "}
            {new Date(campaign.updated_at).toLocaleDateString("pt-BR")}.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Quantidade recebida informada pela instituição; não é uma confirmação de entrega feita
            pelo Vem da Gente. Combine diretamente antes de doar.
          </p>
        </article>
      ))}
    </section>
  );
}
