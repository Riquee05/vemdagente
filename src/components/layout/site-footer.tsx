import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-semibold">Vem da Gente</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Facilitamos a descoberta e o contato com locais de doação e apoio no estado de São Paulo.
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
              <Link to="/sobre" className="hover:text-foreground">
                Sobre o projeto
              </Link>
            </li>
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
                Apoiar o Vem da Gente
              </Link>
            </li>
            <li>
              <Link to="/privacidade" className="hover:text-foreground">
                Privacidade e LGPD
              </Link>
            </li>
          </ul>

          <p className="mt-4 text-xs text-muted-foreground">
            Plataforma independente de descoberta e contato. Não realiza entregas nem garante atendimento ou recebimento. As
            doações em dinheiro são feitas pelos canais oficiais de cada instituição — o Vem da Gente
            não recebe, administra ou intermedia valores.
          </p>
        </nav>
      </div>
    </footer>
  );
}
