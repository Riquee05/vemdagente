import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { PageShell } from "@/components/layout/page-shell";
import { MoneyNotice } from "@/components/money-notice";
import { PointsMap } from "@/components/map/points-map";
import { PointPhoto } from "@/components/points/point-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchPoint } from "@/lib/points";

const BASE_URL = "https://vemdagente.lovable.app";

export const Route = createFileRoute("/pontos/$pointId")({
  loader: async ({ params }) => {
    const point = await fetchPoint(params.pointId);
    if (!point) throw notFound();
    return point;
  },
  head: ({ loaderData }) => {
    const point = loaderData;
    if (!point) {
      return {
        meta: [{ title: "Ponto não encontrado | Vem da Gente" }],
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
            `Endereço, horários, contato, itens aceitos e necessidades de ${point.name}.`,
        },
        { property: "og:title", content: `${point.name} — ponto de coleta | Vem da Gente` },
        {
          property: "og:description",
          content:
            point.description ||
            `Veja o que ${point.name} aceita e o que está precisando agora.`,
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
      <div className="mx-auto max-w-3xl px-4 py-20 text-sm text-muted-foreground">
        Não foi possível carregar este ponto. Tente novamente em instantes.
      </div>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-20 text-sm text-muted-foreground">
        Ponto não encontrado.
      </div>
    </PageShell>
  ),
  component: PointDetailPage,
});

function PointDetailPage() {
  const data = Route.useLoaderData();

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
            {data.curation_status !== "verified" ? (
              <Badge variant="secondary" className="mt-2">
                Em curadoria — visível só para você
              </Badge>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">
              {data.address ? `${data.address} — ` : ""}
              {data.city}
              {data.state ? `/${data.state}` : ""}
            </p>
            {data.description ? <p className="mt-4 text-base">{data.description}</p> : null}

            <dl className="mt-6 space-y-2 text-sm">
              {data.opening_hours ? (
                <div>
                  <dt className="font-medium">Horários</dt>
                  <dd className="text-muted-foreground">{data.opening_hours}</dd>
                </div>
              ) : null}
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

            <h2 className="mt-6 text-lg font-semibold">Aceita</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.accepted.length ? (
                data.accepted.map((category) => (
                  <Badge key={category.id} variant="secondary">
                    {category.label}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda sem itens categorizados neste ponto.
                </p>
              )}
            </div>

            <h2 className="mt-6 text-lg font-semibold">Precisando agora</h2>
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
                    {need.note ? (
                      <p className="mt-1 text-muted-foreground">{need.note}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma necessidade registrada no momento.
                </p>
              )}
            </div>
          </div>
        </div>
        <MoneyNotice className="mt-10" />
      </section>
    </PageShell>
  );
}
