import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { PointsMap } from "@/components/map/points-map";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress, getBrowserLocation } from "@/lib/geocode";
import { fetchCategories, PHOTO_BUCKET } from "@/lib/points";

export const Route = createFileRoute("/_authenticated/cadastrar-ponto")({
  head: () => ({
    meta: [
      { title: "Cadastrar ponto de coleta | DoaAqui" },
      {
        name: "description",
        content:
          "Cadastre um ponto de coleta ou ONG real com foto, localização no mapa e os itens que o local aceita. A curadoria do DoaAqui revisa antes de publicar.",
      },
      { property: "og:title", content: "Cadastrar ponto de coleta | DoaAqui" },
      {
        property: "og:description",
        content: "Adicione um local de doação com foto e localização precisa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CadastrarPontoPage;
});

function CadastrarPontoPage() {
  return null;
}
