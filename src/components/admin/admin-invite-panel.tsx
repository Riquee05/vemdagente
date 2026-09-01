import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { adminStepUpStatus } from "@/lib/admin-2fa.functions";
import {
  createAdminInvite,
  listAdminInvites,
  revokeAdminInvite,
} from "@/lib/admin-invites.functions";

const statusLabels: Record<string, string> = {
  pending: "Aguardando ativação",
  used: "Ativado",
  revoked: "Revogado",
  expired: "Expirado",
};

/**
 * Bloco de convite administrativo de uma candidatura aprovada.
 * Só o dono da plataforma vê e usa; a senha aparece uma única vez.
 */
export function AdminInvitePanel({
  applicationId,
  email,
}: {
  applicationId: string;
  email: string;
}) {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(adminStepUpStatus);
  const fetchInvites = useServerFn(listAdminInvites);
  const create = useServerFn(createAdminInvite);
  const revoke = useServerFn(revokeAdminInvite);

  const [senha, setSenha] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const status = useQuery({ queryKey: ["admin-step-up"], queryFn: () => fetchStatus() });
  const isOwner = status.data?.isOwner === true;

  const invites = useQuery({
    queryKey: ["admin-invites"],
    queryFn: () => fetchInvites(),
    enabled: isOwner,
  });

  const invite = (invites.data ?? []).find(
    (i) => i.application_id === applicationId || i.email === email.toLowerCase(),
  );

  const gerar = useMutation({
    mutationFn: () => create({ data: { application_id: applicationId } }),
    onSuccess: (result) => {
      setSenha(result.password);
      setCopiado(false);
      toast.success("Senha temporária gerada. Copie e envie para a pessoa.");
      queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível gerar a senha."),
  });

  const revogar = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      setSenha(null);
      toast.success("Convite revogado.");
      queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível revogar o convite."),
  });

  if (!isOwner) return null;

  return (
    <div className="mt-3 border-2 border-dashed border-foreground/30 bg-surface/60 p-3">
      <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
        <KeyRound className="size-3.5" aria-hidden="true" /> Acesso administrativo
      </p>

      {invite && (
        <p className="mt-1 text-xs text-muted-foreground">
          {statusLabels[invite.status] ?? invite.status}
          {invite.status === "pending" &&
            ` · expira em ${new Date(invite.expires_at).toLocaleDateString("pt-BR")}`}
        </p>
      )}

      {senha && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            Copie agora — esta senha não será mostrada novamente. Envie por WhatsApp ou e-mail junto
            com o link <strong className="text-foreground">/ativar-admin</strong>.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 border-2 border-foreground bg-background px-2 py-1 font-mono text-sm">
              {senha}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(senha);
                setCopiado(true);
                toast.success("Senha copiada.");
              }}
            >
              {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={gerar.isPending}
          onClick={() => gerar.mutate()}
        >
          {invite?.status === "pending" ? "Gerar nova senha" : "Gerar senha temporária"}
        </Button>
        {invite?.status === "pending" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={revogar.isPending}
            onClick={() => revogar.mutate(invite.id)}
          >
            Revogar
          </Button>
        )}
      </div>
    </div>
  );
}
