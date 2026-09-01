import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HeartHandshake, Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/doar", label: "Doar" },
  { to: "/pedir-ajuda", label: "Pedir Ajuda" },
  { to: "/pontos", label: "Pontos" },
  { to: "/assistente", label: "Assistente" },
  { to: "/voluntarios", label: "Voluntários" },
  { to: "/apoiar", label: "Apoiar" },
] as const;

export function SiteHeader() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  // O atalho da administração só existe para quem realmente é da equipe.
  const admin = useQuery({
    queryKey: ["header-is-admin", user?.id ?? null],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
  });

  return (
    <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 -rotate-3 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground">
            <HeartHandshake className="size-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg tracking-tight">DoaAqui</span>
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="px-3 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide transition-colors hover:text-primary data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!loading && user && admin.data === true && (
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          {!loading && (
            <Button asChild variant={user ? "outline" : "default"} size="sm" className="hidden md:inline-flex">
              <Link to={user ? "/minha-conta" : "/entrar"}>{user ? "Minha conta" : "Entrar"}</Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="font-display">DoaAqui</SheetTitle>
              <nav aria-label="Navegação" className="mt-6 flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
                {!loading && user && admin.data === true && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="mt-2 border-2 border-foreground px-3 py-2 text-sm font-semibold uppercase tracking-wide"
                  >
                    Painel administrador
                  </Link>
                )}
                <Link
                  to={user ? "/minha-conta" : "/entrar"}
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                >
                  {user ? "Minha conta" : "Entrar"}
                </Link>
              </nav>

            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
