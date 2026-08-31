import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-semibold">DoaAqui</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Conectamos quem quer doar com pontos de coleta e ONGs perto de você — e ajudamos quem
            precisa a encontrar apoio.
          </p>
        </div>
        <nav aria-label="Doar" className="text-sm">
          <p className="font-medium">Para doar</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link to="/doar" className="hover:text-foreground">
                Encontrar pontos
              </Link>
            </li>
            <li>
              <Link to="/pontos" className="hover:text-foreground">
                Todos os pontos
              </Link>
            </li>
            <li>
              <Link to="/assistente" className="hover:text-foreground">
                Assistente inteligente
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Ajuda" className="text-sm">
          <p className="font-medium">Preciso de ajuda</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link to="/pedir-ajuda" className="hover:text-foreground">
                Registrar pedido
              </Link>
            </li>
            <li>
              <Link to="/entrar" className="hover:text-foreground">
                Entrar na conta
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Projeto" className="text-sm">
          <p className="font-medium">O projeto</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link to="/apoiar" className="hover:text-foreground">
                Apoiar o DoaAqui
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Projeto independente e sem fins de lucro. Não intermediamos doações: indicamos pontos
            reais e curados.
          </p>
        </nav>
      </div>
    </footer>
  );
}
