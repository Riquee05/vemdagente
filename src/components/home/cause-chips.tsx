import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { fetchCauses } from "@/lib/points";

/** Atalhos por causa: levam ao mapa já filtrado. */
export function CauseChips() {
  const causes = useQuery({ queryKey: ["causes"], queryFn: fetchCauses });
  if (!causes.data || causes.data.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <h2 className="text-3xl md:text-4xl">Qual causa você quer apoiar?</h2>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Escolha uma causa e veja no mapa os locais que trabalham com ela.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        {causes.data.map((cause, index) => (
          <Link
            key={cause.id}
            to="/doar"
            search={{ causa: cause.id }}
            className={`card-ink bg-card px-4 py-2 font-semibold transition-transform hover:rotate-0 hover:bg-primary hover:text-primary-foreground ${
              index % 2 === 0 ? "-rotate-1" : "rotate-1"
            }`}
          >
            {cause.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
