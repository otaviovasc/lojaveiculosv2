import { AutoEntryDomainCard } from "./AutoEntryDomainPrimitives";
import { autoEntryCalculationLabel } from "./autoEntryLabels";
import { findRule } from "./domainModel";
import type { AutoEntryDomainPanelProps } from "./domainPanelTypes";
import { SaleExtraCommissionCard } from "./SaleExtraCommissionCard";
import { SaleSellerOverrideCard } from "./SaleSellerOverrideCard";

export function SaleRulesPanel(props: AutoEntryDomainPanelProps) {
  const standard = findRule(props.rules, "sale.standard_commission", null);
  return (
    <div className="grid gap-4">
      <AutoEntryDomainCard
        description="A receita da venda segue as datas dos pagamentos. Esta regra apenas repassa a comissão registrada na venda."
        title="Comissão padrão da venda"
        tone="blue"
      >
        {standard ? (
          <dl className="grid gap-3 sm:grid-cols-3">
            <Value
              label="Cálculo"
              value={autoEntryCalculationLabel(standard.calculation)}
            />
            <Value label="Resolução" value="Substituída por vendedor" />
            <Value
              label="Status"
              value={standard.status === "active" ? "Ativa" : "Pausada"}
            />
          </dl>
        ) : (
          <p className="text-sm font-bold text-muted">
            Nenhuma regra padrão foi retornada. Não há valor numérico presumido.
          </p>
        )}
      </AutoEntryDomainCard>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <SaleSellerOverrideCard {...props} />
        <SaleExtraCommissionCard {...props} />
      </div>
    </div>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line/60 bg-app-elevated p-3">
      <dt className="text-xs font-black uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-black text-app-text">{value}</dd>
    </div>
  );
}
