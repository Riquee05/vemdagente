import { whatsappLink } from "@/lib/contact-links";
import { Link } from "@tanstack/react-router";

import { PointPhoto } from "@/components/points/point-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDistance, type NearbyPoint } from "@/lib/points";

export function PointCard({
  point,
  onHighlight,
  active,
  needs = [],
  context = "donation",
}: {
  point: NearbyPoint;
  onHighlight?: (id: string) => void;
  active?: boolean;
  needs?: { urgency: string; category_label: string; note: string | null; updated_at?: string }[];
  context?: "donation" | "support";
}) {
  const distance = formatDistance(point.distance_km);

  return (
    <article
      onFocus={onHighlight ? () => onHighlight(point.id) : undefined}
      onMouseEnter={onHighlight ? () => onHighlight(point.id) : undefined}
      className={`flex gap-4 rounded-xl border bg-card p-4 transition-colors ${
        active ? "border-accent" : "border-border"
      }`}
    >
      <PointPhoto
        path={point.photo_url}
        alt={`Foto de ${point.name}`}
        className="h-20 w-20 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-base font-semibold">{point.name}</h3>
          {distance ? <Badge variant="secondary">{distance}</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {point.address ? `${point.address} — ` : ""}
          {point.city}
          {point.state ? `/${point.state}` : ""}
        </p>
        {point.confirmation_status === "confirmed" ? (
          <Badge className="mt-2 text-xs">Recebimento de doações confirmado</Badge>
        ) : null}
        {point.confirmed_at && (
          <p className="mt-1 text-xs text-muted-foreground">
            Última confirmação: {formatDate(point.confirmed_at)}
            {Date.now() - Date.parse(point.confirmed_at) > 90 * 86400000
              ? " · confirme antes de ir"
              : ""}
          </p>
        )}
        {point.opening_hours ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Horário de funcionamento: {point.opening_hours}
          </p>
        ) : null}
        {needs.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-amber-700">Precisa agora:</span>
            {needs.slice(0, 3).map((need, index) => (
              <Badge
                key={index}
                title={need.updated_at ? `Atualizado em ${formatDate(need.updated_at)}` : undefined}
                variant={
                  need.urgency === "critical" || need.urgency === "high" ? "destructive" : "outline"
                }
                className="text-xs"
              >
                {need.category_label}
                {need.updated_at ? ` · ${formatDate(need.updated_at)}` : ""}
                {need.urgency === "critical"
                  ? " (crítico)"
                  : need.urgency === "high"
                    ? " (urgente)"
                    : ""}
              </Badge>
            ))}
            {needs.length > 3 && (
              <span className="text-xs text-muted-foreground">+{needs.length - 3}</span>
            )}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/pontos/$pointId" params={{ pointId: point.id }}>
              Ver detalhes
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Como chegar
            </a>
          </Button>
          {point.phone ? (
            <Button asChild size="sm" variant="ghost">
              <a href={`tel:${point.phone.replace(/\D/g, "")}`}>Ligar</a>
            </Button>
          ) : null}
          {whatsappLink(point.whatsapp) ? (
            <Button asChild size="sm" variant="ghost">
              <a href={whatsappLink(point.whatsapp)} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {context === "support"
            ? "Entre em contato com o local para confirmar o atendimento e os documentos necessários."
            : "Combine direto com o local e leve sua doação — o Vem da Gente não intermedia a entrega."}
        </p>
      </div>
    </article>
  );
}
