/** Aviso legal: o Vem da Gente não recebe nem administra doações em dinheiro. */
export function MoneyNotice({ className = "" }: { className?: string }) {
  return (
    <aside className={`card-ink bg-surface p-4 text-sm ${className}`}>
      <p className="font-semibold">Doação em dinheiro é feita direto com a instituição</p>
      <p className="mt-2 text-muted-foreground">
        Somos uma plataforma independente que conecta pessoas dispostas a ajudar instituições e
        projetos sociais. As doações são realizadas pelos canais oficiais de cada instituição. A
        plataforma Vem da Gente não recebe, administra ou intermedia valores.
      </p>
    </aside>
  );
}
