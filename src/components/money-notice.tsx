/** Aviso legal: o DoaAqui não recebe nem administra doações em dinheiro. */
export function MoneyNotice({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`rounded-md border-2 border-foreground/80 bg-surface p-4 text-sm shadow-[4px_4px_0_0_hsl(var(--foreground))] ${className}`}
    >
      <p className="font-semibold">Doação em dinheiro é feita direto com a instituição</p>
      <p className="mt-2 text-muted-foreground">
        Somos uma plataforma independente que conecta pessoas dispostas a ajudar instituições e
        projetos sociais. As doações são realizadas pelos canais oficiais de cada instituição. A
        plataforma DoaAqui não recebe, administra ou intermedia valores.
      </p>
    </aside>
  );
}
