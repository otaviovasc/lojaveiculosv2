import { Activity, Calculator, Replace } from "lucide-react";
import {
  AutoEntryDomainCard,
  AutoEntryStat,
} from "./AutoEntryDomainPrimitives";
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
      >
        {standard ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <AutoEntryStat
              icon={Calculator}
              label="Cálculo"
              value={autoEntryCalculationLabel(standard.calculation)}
            />
            <AutoEntryStat
              icon={Replace}
              label="Resolução"
              value="Substituída por vendedor"
            />
            <AutoEntryStat
              icon={Activity}
              label="Status"
              value={standard.status === "active" ? "Ativa" : "Pausada"}
            />
          </div>
        ) : (
          <p className="text-sm font-bold text-muted">
            Nenhuma regra padrão foi retornada. Não há valor numérico presumido.
          </p>
        )}
      </AutoEntryDomainCard>
      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <SaleSellerOverrideCard {...props} />
        <SaleExtraCommissionCard {...props} />
      </div>
    </div>
  );
}
