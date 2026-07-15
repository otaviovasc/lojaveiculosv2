import { Percent } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { FinanceField, FinanceInput, FinancePanel } from "./FinanceFormParts";
import { formatCurrency } from "./financeBillsFormat";
import type { CommissionRule } from "./types";

export type CommissionDraft = {
  category: string;
  name: string;
  percentageBasisPoints: number;
  type: "percentage";
};

export function CommissionRulesPanel({
  canCreate = true,
  items,
  onCreate,
}: {
  canCreate?: boolean;
  items: CommissionRule[];
  onCreate: (input: CommissionDraft) => Promise<void> | void;
}) {
  const [isOpen, setIsOpen] = useState(items.length === 0);
  const previousCount = useRef(items.length);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeCount = items.filter((rule) => rule.status === "active").length;
  const inactiveCount = items.length - activeCount;

  useEffect(() => {
    if (previousCount.current === 0 && items.length > 0) setIsOpen(false);
    if (items.length === 0) setIsOpen(true);
    previousCount.current = items.length;
  }, [items.length]);

  const submitRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const percentage = Number(data.get("percent"));
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      setError("Informe um percentual entre 0,01% e 100%.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onCreate({
        category: String(data.get("category") || "Venda"),
        name: String(data.get("name") || "Regra"),
        percentageBasisPoints: Math.round(percentage * 100),
        type: "percentage",
      });
      form.reset();
    } catch {
      setError("Não foi possível criar a regra de comissão.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FinancePanel
      actions={
        <button
          aria-controls="commission-rules-content"
          aria-expanded={isOpen}
          className="min-h-11 rounded-lg border border-line bg-app px-3 text-xs font-black text-app-text transition-all hover:border-line-strong"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          {isOpen ? "Ocultar regras" : `Gerenciar (${items.length})`}
        </button>
      }
      icon={<Percent className="size-5" />}
      title="Regras de comissão"
    >
      <p className="mt-2 text-sm font-bold text-muted">
        {ruleCountLabel(activeCount, inactiveCount)}
      </p>
      {isOpen ? (
        <div
          className="mt-4 grid gap-4 border-t border-line/60 pt-4"
          id="commission-rules-content"
        >
          {items.length ? <CommissionRuleList items={items} /> : null}
          {canCreate ? (
            <form
              className="grid gap-3 md:grid-cols-4"
              onSubmit={(event) => void submitRule(event)}
            >
              <FinanceField label="Nome">
                <FinanceInput name="name" required />
              </FinanceField>
              <FinanceField label="Categoria">
                <FinanceInput name="category" required />
              </FinanceField>
              <FinanceField label="%">
                <FinanceInput
                  max="100"
                  min="0.01"
                  name="percent"
                  required
                  step="0.01"
                  type="number"
                />
              </FinanceField>
              <button
                className="min-h-11 self-end rounded-lg bg-accent px-4 text-sm font-black text-accent-foreground transition-all hover:bg-accent-strong hover:text-accent-strong-foreground"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Criando regra…" : "Criar regra"}
              </button>
            </form>
          ) : (
            <p className="text-sm font-bold text-muted">
              A criação exige permissão financeira.
            </p>
          )}
          {error ? (
            <p className="text-sm font-bold text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </FinancePanel>
  );
}

function CommissionRuleList({ items }: { items: CommissionRule[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
      {items.map((rule) => (
        <article
          className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-line bg-app p-3"
          key={rule.id}
        >
          <div className="min-w-0">
            <h4 className="truncate text-sm font-black text-app-text">
              {rule.name}
            </h4>
            <p className="text-xs font-bold text-muted">{rule.category}</p>
            <p className="mt-1 text-xs font-bold text-muted">
              {rule.sellerUserId ? "Vendedor específico" : "Toda a equipe"}
            </p>
          </div>
          <div className="grid shrink-0 justify-items-end gap-2">
            <strong className="whitespace-nowrap text-sm font-black text-accent-strong">
              {commissionRuleValue(rule)}
            </strong>
            <FeatureStatusBadge
              size="dense"
              tone={rule.status === "active" ? "success" : "neutral"}
            >
              {rule.status === "active" ? "Ativa" : "Pausada"}
            </FeatureStatusBadge>
          </div>
        </article>
      ))}
    </div>
  );
}

export function commissionRuleValue(rule: CommissionRule) {
  if (rule.type === "fixed_amount") {
    return rule.fixedAmountCents === null
      ? "Valor não informado"
      : formatCurrency(rule.fixedAmountCents);
  }
  if (rule.type === "manual") return "Manual";
  if (rule.percentageBasisPoints === null) return "Percentual não informado";
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(rule.percentageBasisPoints / 100)}%`;
}

function ruleCountLabel(activeCount: number, inactiveCount: number) {
  if (activeCount === 0 && inactiveCount === 0) {
    return "Nenhuma regra cadastrada. Crie a primeira configuração abaixo.";
  }
  const active = `${activeCount} ${activeCount === 1 ? "regra ativa" : "regras ativas"}`;
  if (inactiveCount === 0) return `${active}.`;
  return `${active} · ${inactiveCount} ${inactiveCount === 1 ? "pausada" : "pausadas"}.`;
}
