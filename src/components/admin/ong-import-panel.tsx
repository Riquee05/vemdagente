import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ongCandidates,
  normalizeOngText,
  ONG_SOURCE_DATE,
  ONG_SOURCE_URL,
} from "@/lib/ong-candidates";
import { importOngCandidate } from "@/lib/ong-import.functions";

export function OngImportPanel() {
  const queryClient = useQueryClient();
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [processed, setProcessed] = useState(new Set<string>());
  const [page, setPage] = useState(0);
  const filtered = ongCandidates.filter((item) =>
    normalizeOngText(`${item.name} ${item.address} ${item.cnpj}`).includes(
      normalizeOngText(search),
    ),
  );
  const importOne = useMutation({
    mutationFn: (cnpj: string) => importOngCandidate({ data: { cnpj } }),
    onSuccess: (result, cnpj) => {
      setProcessed((previous) => new Set([...previous, cnpj]));
      if (!batchRunning)
        toast.success(
          result.status === "created"
            ? "Instituição adicionada à fila de curadoria."
            : "A instituição já tem cadastro. Nenhum dado foi alterado.",
        );
      void queryClient.invalidateQueries({ queryKey: ["curation-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["curation-counts"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar."),
  });
  const importBatch = async () => {
    setBatchRunning(true);
    setBatchProgress(0);
    let completed = 0;
    try {
      for (const item of ongCandidates) {
        if (processed.has(item.cnpj)) continue;
        await importOne.mutateAsync(item.cnpj);
        completed += 1;
        setBatchProgress(completed);
      }
      toast.success("Lote processado. Revise as instituições antes de publicar.");
    } catch {
      toast.info(
        `${completed} instituições processadas. O lote foi interrompido; você pode tentar novamente sem repetir cadastros.`,
      );
    } finally {
      setBatchRunning(false);
    }
  };
  return (
    <details className="rounded-xl border border-border bg-card p-6">
      <summary className="cursor-pointer font-semibold">
        100 instituições da capital para cadastrar
      </summary>
      <p className="mt-3 text-sm text-muted-foreground">
        Base oficial Pró-Social, de {ONG_SOURCE_DATE}. Os endereços são localizados ao cadastrar; as
        instituições entram como pendentes e com doações não confirmadas. Confirme contato,
        localização e itens aceitos antes de aprovar. A lista não representa todas as ONGs da
        cidade.
      </p>
      <a
        href={ONG_SOURCE_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-sm underline"
      >
        Consultar fonte oficial
      </a>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          disabled={batchRunning || importOne.isPending || processed.size === ongCandidates.length}
          onClick={() => void importBatch()}
        >
          {batchRunning
            ? `Processando lote: ${batchProgress} concluídas…`
            : "Cadastrar lote para revisão"}
        </Button>
        <span className="text-sm text-muted-foreground">
          O cadastro usa a conexão do Google Maps para localizar cada endereço.
        </span>
      </div>
      <Input
        className="mt-4"
        aria-label="Buscar instituições do lote"
        placeholder="Nome, bairro ou CNPJ"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
      />
      <p className="mt-2 text-sm text-muted-foreground">
        {filtered.length} instituições encontradas
      </p>
      <ul className="mt-4 space-y-3">
        {filtered.slice(page * 10, (page + 1) * 10).map((item) => (
          <li key={item.cnpj} className="rounded-lg border border-border p-4">
            <h3 className="font-semibold">{item.name}</h3>
            <p className="text-sm text-muted-foreground">
              {item.address} — CEP {item.postalCode}
            </p>
            <p className="text-sm text-muted-foreground">
              CNPJ: {item.cnpj} · Telefone na fonte: {item.phone || "não informado"}
            </p>
            <Button
              className="mt-3"
              size="sm"
              disabled={batchRunning || importOne.isPending || processed.has(item.cnpj)}
              onClick={() => importOne.mutate(item.cnpj)}
            >
              {processed.has(item.cnpj)
                ? "Cadastro localizado"
                : importOne.isPending && importOne.variables === item.cnpj
                  ? "Localizando e cadastrando…"
                  : "Cadastrar para revisão"}
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
          Anterior
        </Button>
        <span className="text-sm">
          Página {page + 1} de {Math.max(1, Math.ceil(filtered.length / 10))}
        </span>
        <Button
          variant="outline"
          disabled={(page + 1) * 10 >= filtered.length}
          onClick={() => setPage(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </details>
  );
}
