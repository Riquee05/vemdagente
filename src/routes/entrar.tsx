import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar" },
      { name: "description", content: "Entre com sua Conta do Google." },
      { property: "og:title", content: "Entrar" },
      { property: "og:description", content: "Entre com sua Conta do Google." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EntrarPage,
});

function GoogleG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/** Retorno interno preservado no login (ex.: tela de autorização de apps). */
function safeNext(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("next");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function EntrarPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function accountDestination() {
    const [{ data: isAdmin }, { data: member }] = await Promise.all([
      supabase.rpc("is_admin"),
      supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user?.id ?? "")
        .eq("status", "active")
        .maybeSingle(),
    ]);
    if (isAdmin === true) return "/admin" as const;
    if (member) return "/colaborador" as const;
    return "/minha-conta" as const;
  }

  useEffect(() => {
    const recovering =
      typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).has("recuperar") ||
        window.location.hash.includes("type=recovery"));
    if (!loading && user && !recovering) {
      const next = safeNext();
      if (next) {
        window.location.replace(next);
        return;
      }
      void accountDestination().then((to) => navigate({ to, replace: true }));
    }
  }, [loading, user, navigate]);

  async function signInWithGoogle() {
    setBusy(true);
    const next = safeNext();
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: next ? `${window.location.origin}${next}` : window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Não conseguimos entrar com o Google agora. Tente de novo.");
      return;
    }
    if (result.redirected) return;
    if (next) {
      window.location.replace(next);
      return;
    }
    navigate({ to: "/minha-conta" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-10 shadow-soft">
        <div className="flex justify-center">
          <GoogleG className="h-10 w-10" />
        </div>

        <h1 className="mt-6 text-center font-display text-2xl text-card-foreground">Entrar</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Use sua Conta do Google</p>

        <Button
          variant="outline"
          className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-full border-border bg-background text-foreground hover:bg-secondary"
          onClick={signInWithGoogle}
          disabled={busy || loading}
        >
          <GoogleG className="h-5 w-5" />
          <span className="text-sm font-medium">
            {busy ? "Entrando..." : "Continuar com Google"}
          </span>
        </Button>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
