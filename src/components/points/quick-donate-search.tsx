import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCategories } from "@/lib/points";

/** Busca rápida da página inicial: leva para /doar com filtros preenchidos. */
export function QuickDonateSearch() {
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState("all");
  const [local, setLocal] = useState("");
  const categories = useQuery({ queryKey: ["item-categories"], queryFn: fetchCategories });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const term = local.trim().slice(0, 120);
    navigate({
      to: "/doar",
      search: {
        categoria: categoria === "all" ? undefined : categoria,
        local: term || undefined,
      },
    });
  }

  return (
    <AccessibleForm
      onSubmit={submit}
      className="card-ink mt-10 grid max-w-2xl gap-4 bg-card p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <div className="grid gap-2">
        <Label htmlFor="quick-categoria" className="font-display text-xs uppercase tracking-widest">
          O que você quer doar?
        </Label>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger id="quick-categoria">
            <SelectValue placeholder="Qualquer item" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer item</SelectItem>
            {(categories.data ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="quick-local" className="font-display text-xs uppercase tracking-widest">
          Onde você está?
        </Label>
        <Input
          id="quick-local"
          value={local}
          maxLength={120}
          onChange={(event) => setLocal(event.target.value)}
          placeholder="CEP, bairro ou rua"
        />
      </div>
      <Button type="submit" className="card-ink-primary font-display uppercase">
        Buscar pontos
      </Button>
    </AccessibleForm>
  );
}
