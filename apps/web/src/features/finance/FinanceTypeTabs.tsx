import { Banknote, HandCoins, Receipt, TrendingUp } from "lucide-react";
import { FeatureSegmentedControl } from "../../components/ui/FeatureControls";
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
    <FeatureSegmentedControl
      ariaLabel="Tipos"
      onChange={onTypeChange}
      options={financeTypes.map((type) => ({
        icon: typeIcons[type],
        label: financeTypeLabels[type],
        value: type,
      }))}
      value={activeType}
    />
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
            Lançamentos financeiros
          </h2>
          <p className="max-w-3xl text-sm font-bold text-muted">
            Registre gastos, receitas e comissões com status operacional,
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
