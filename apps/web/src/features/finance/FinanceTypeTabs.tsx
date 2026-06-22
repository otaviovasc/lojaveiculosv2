import { Banknote, HandCoins, Receipt, TrendingUp } from "lucide-react";
import { FinanceBadge, financeTypeLabels } from "./FinanceFormParts";
import type { FinanceEntryType } from "./types";

const financeTypes: FinanceEntryType[] = ["expense", "revenue", "commission"];

const typeIcons = {
  commission: HandCoins,
  expense: Receipt,
  revenue: TrendingUp,
} satisfies Record<FinanceEntryType, typeof Receipt>;

export function FinanceTypeTabs({
  activeType,
  onTypeChange,
}: {
  activeType: FinanceEntryType;
  onTypeChange: (type: FinanceEntryType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipos">
      {financeTypes.map((type) => {
        const Icon = typeIcons[type];
        const isActive = type === activeType;
        return (
          <button
            aria-selected={isActive}
            className={[
              "flex min-h-11 items-center gap-2 rounded-lg border px-4",
              "text-sm font-black focus:shadow-[var(--shadow-focus)] focus:outline-none",
              isActive
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-line bg-panel text-muted",
            ].join(" ")}
            key={type}
            onClick={() => onTypeChange(type)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden="true" className="size-4" />
            {financeTypeLabels[type]}
          </button>
        );
      })}
    </div>
  );
}

export function FinanceModuleHeader() {
  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <FinanceBadge>Financeiro</FinanceBadge>
            <FinanceBadge>Anexos opcionais</FinanceBadge>
          </div>
          <h2 className="text-2xl font-black text-app-text lg:text-4xl">
            Lancamentos financeiros
          </h2>
          <p className="max-w-3xl text-sm font-bold text-muted">
            Registre gastos, receitas e comissoes com status operacional,
            vencimento e comprovante opcional por upload assinado.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm font-black text-accent-strong">
          <Banknote aria-hidden="true" className="size-4" />
          Fluxo financeiro por loja
        </div>
      </div>
    </section>
  );
}
