import { createFileRoute, Link } from "@tanstack/react-router";

import { PageShell } from "@/components/layout/page-shell";
import { MoneyNotice } from "@/components/money-notice";
import { PointsMap } from "@/components/map/points-map";
import { PointPhoto } from "@/components/points/point-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SuggestCorrection } from "@/components/points/suggest-correction";
import { CONFIRMATION_LABELS, LOCATION_TYPE_LABELS, SOURCE_LABELS, formatDate } from "@/lib/points";
import { getPublicPointDetail } from "@/lib/point-detail.functions";

const BASE_URL = "https://vemdagente.lovable.app";

export const Route = createFileRoute("/pontos/$pointId")({
  loader: async ({ params }) => {
    return getPublicPointDetail({ data: { id: params.pointId } });
  },
  head: ({ loaderData }) => {
    const point = loaderData?.status === "available" ? loaderData.point : null;
    if (!point) {
      return {
        meta: [
          { title: "Local indisponível | Vem da Gente" },
          {
            name: "description",
            content: "Este local não está disponível na área de atuação atual do Vem da Gente.",
          },
          { property: "og:title", content: "Local indisponível | Vem da Gente" },
          {
            property: "og:description",
            content: "Consulte os locais disponíveis no estado de São Paulo.",
          },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
        ],
      };
    }

    const pageUrl = `${BASE_URL}/pontos/${point.id}`;
    const imageUrl = point.photo_url?.startsWith("http") ? point.photo_url : undefined;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: point.name,
      description: point.description || undefined,
      url: pageUrl,
      telephone: point.phone || undefined,
      openingHours: point.opening_hours || undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: point.address || undefined,
        addressLocality: point.city,
        addressRegion: point.state || undefined,
        addressCountry: "BR",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: point.lat,
        longitude: point.lng,
      },
      ...(imageUrl ? { image: imageUrl } : {}),
    };

    return {
      meta: [
        { title: `${point.name} — ponto de coleta | Vem da Gente` },
        {
          name: "description",
          content:
            point.description ||
            `Consulte endereço, horários, contato e informações cadastradas de ${point.name}. Confirme antes de ir.`,
        },
        { property: "og:title", content: `${point.name} — ponto de coleta | Vem da Gente` },
        {
          property: "og:description",
          content:
            point.description ||
            `Consulte as informações cadastradas de ${point.name} e confirme diretamente antes de ir.`,
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: pageUrl },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: pageUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
  errorComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-3xl">Não foi possível carregar este local</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A falha pode ser temporária. Tente novamente ou volte à busca.
        </p>
        <Button asChild className="mt-6">
          <Link to="/pontos">Ver locais em São Paulo</Link>
        </Button>
      </div>
    </PageShell>
  ),
  component: PointDetailPage,
});

function PointDetailPage() {
  const result = Route.useLoaderData();
  if (result.status !== "available") {
    return (
      <PageShell>
        <section className="mx-auto max-w-3xl px-4 py-20">
          <h1 className="text-3xl">
            {result.status === "not_found" ? "Local não encontrado" : "Local indisponível"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {result.status === "not_found"
              ? "Este cadastro não existe ou o endereço do link está incorreto."
              : "Este cadastro está fora da área de atuação atual, está em revisão ou não está publicado."}
          </p>
          <Button asChild className="mt-6">
            <Link to="/pontos">Ver locais no estado de São Paulo</Link>
          </Button>
        </section>
      </PageShell>
    );
  }
  const data = result.point;

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <Link to="/pontos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar para os pontos
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-[1.1fr_1fr]">
          <div>
            <PointPhoto
              path={data.photo_url}
              alt={`Foto de ${data.name}`}
              className="h-56 w-full rounded-xl"
            />
            <h1 className="mt-6 text-3xl font-semibold">{data.name}</h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {LOCATION_TYPE_LABELS[data.location_type] ?? "Tipo não informado"}
            </p>
            {data.curation_status !== "verified" ? (
              <Badge variant="secondary" className="mt-2">
                Em revisão — visível só para você
              </Badge>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {data.confirmation_status === "confirmed" && data.confirmed_at ? (
                <Badge>Recebimento de doações confirmado</Badge>
              ) : (
                <Badge variant="outline">
                  {CONFIRMATION_LABELS[data.confirmation_status] ?? "Não confirmado"}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.address ? `${data.address} — ` : ""}
              {data.city}
              {data.state ? `/${data.state}` : ""}
            </p>
            {data.description ? <p className="mt-4 text-base">{data.description}</p> : null}

            <dl className="mt-6 space-y-2 text-sm">
              <div>
                <dt className="font-medium">Origem do cadastro</dt>
                <dd className="text-muted-foreground">
                  {SOURCE_LABELS[data.source] ?? "Não informada"}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Confirmação</dt>
                <dd className="text-muted-foreground">
                  {data.confirmation_status === "confirmed" && !data.confirmed_at
                    ? "Não confirmado"
                    : (CONFIRMATION_LABELS[data.confirmation_status] ?? "Não confirmado")}
                  {data.confirmation_status === "confirmed" && data.confirmed_at
                    ? ` — última confirmação em ${formatDate(data.confirmed_at)}`
                    : ""}
                </dd>
              </div>
              {data.opening_hours ? (
                <div>
                  <dt className="font-medium">Horário de funcionamento</dt>
                  <dd className="text-muted-foreground">{data.opening_hours}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium">Horário para receber doações</dt>
                <dd className="text-muted-foreground">
                  {data.donation_hours ||
                    "Não informado. O horário de funcionamento não garante recebimento de doações — confirme antes de ir."}
                </dd>
              </div>
              {data.donation_method ? (
                <div>
                  <dt className="font-medium">Como doar</dt>
                  <dd className="text-muted-foreground">{data.donation_method}</dd>
                </div>
              ) : null}
              {data.phone ? (
                <div>
                  <dt className="font-medium">Telefone</dt>
                  <dd className="text-muted-foreground">{data.phone}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              {data.whatsapp ? (
                <Button asChild>
                  <a
                    href={`https://wa.me/${data.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Falar no WhatsApp
                  </a>
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${data.lat}&mlon=${data.lng}#map=17/${data.lat}/${data.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir no mapa
                </a>
              </Button>
              {data.website ? (
                <Button asChild variant="ghost">
                  <a href={data.website} target="_blank" rel="noopener noreferrer">
                    Site
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <div>
            <PointsMap
              center={[data.lat, data.lng]}
              zoom={16}
              points={[{ id: data.id, name: data.name, lat: data.lat, lng: data.lng }]}
              className="h-72 w-full overflow-hidden rounded-xl border border-border"
            />

            {data.causes.length ? (
              <>
                <h2 className="mt-6 text-lg font-semibold">Causas atendidas</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.causes.map((cause) => (
                    <Badge key={cause.id} variant="outline">
                      {cause.label}
                    </Badge>
                  ))}
                </div>
              </>
            ) : null}

            <h2 className="mt-6 text-lg font-semibold">Itens que podem ser aceitos</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.accepted.length ? (
                data.accepted.map((category) => (
                  <Badge key={category.id} variant="secondary">
                    {category.label}
                    {category.confirmed_at
                      ? ` · confirmado em ${formatDate(category.confirmed_at)}`
                      : " · não confirmado"}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda sem itens informados para este local.
                </p>
              )}
            </div>

            <h2 className="mt-6 text-lg font-semibold">Necessidades atuais</h2>
            <div className="mt-2 space-y-2">
              {data.needs.length ? (
                data.needs.map((need) => (
                  <div key={need.id} className="rounded-lg border border-border p-3 text-sm">
                    <span className="font-medium">{need.category.label}</span>
                    {need.urgency !== "normal" ? (
                      <Badge className="ml-2" variant="destructive">
                        {need.urgency}
                      </Badge>
                    ) : null}
                    {need.note ? <p className="mt-1 text-muted-foreground">{need.note}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Atualizado em {formatDate(need.updated_at)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este local ainda não informou suas necessidades atuais. Entre em contato para
                  saber como ajudar.
                </p>
              )}
            </div>

            <div className="mt-6">
              <SuggestCorrection pointId={data.id} />
            </div>
          </div>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Reunimos locais a partir de dados públicos e indicações da comunidade. Confira os detalhes
          e entre em contato com a instituição antes de levar sua doação.
        </p>
        <MoneyNotice className="mt-6" />
      </section>
    </PageShell>
  );
}
