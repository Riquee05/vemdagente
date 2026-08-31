import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-3xl px-4 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">{phase}</p>
        <h1 className="mt-3 text-4xl font-semibold">{title}</h1>
        <p className="mt-4 text-base text-muted-foreground">{description}</p>
        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
          Esta tela entra em construção na próxima fase do plano. A fundação (banco, contas e
          navegação) já está pronta.
        </div>
      </section>
    </PageShell>
  );
}
