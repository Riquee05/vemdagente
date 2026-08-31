import { Link } from "@tanstack/react-router";
import { HeartHandshake, Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { to: "/doar", label: "Doar" },
  { to: "/pedir-ajuda", label: "Pedir Ajuda" },
  { to: "/pontos", label: "Pontos" },
  { to: "/assistente", label: "Assistente" },
  { to: "/apoiar", label: "Apoiar" },
] as const;

export function SiteHeader() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HeartHandshake className="size-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">DoaAqui</span>
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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
