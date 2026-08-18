import { Activity, Calculator, Replace } from "lucide-react";
import { useState } from "react";
import { AutoEntryStat } from "./AutoEntryDomainPrimitives";
import { autoEntryCalculationLabel } from "./autoEntryLabels";
import { findRule } from "./domainModel";
import type { AutoEntryDomainPanelProps } from "./domainPanelTypes";
import { AutoEntryTeamRosterCard } from "./AutoEntryTeamRosterCard";
import { SaleExtraCommissionCard } from "./SaleExtraCommissionCard";
import { SaleSellerOverrideCard } from "./SaleSellerOverrideCard";

export function SaleRulesPanel(props: AutoEntryDomainPanelProps) {
  const standard = findRule(props.rules, "sale.standard_commission", null);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");

  return (
    <div className="grid gap-5">
      <AutoEntryTeamRosterCard
        onSelectSeller={setSelectedSellerId}
        rules={props.rules}
        selectedSellerId={selectedSellerId}
        sellers={props.sellers}
      />

      <section aria-label="Comissão padrão da venda" className="ae-info-strip">
        <div className="ae-info-strip__intro">
          <h3 className="ae-info-strip__title">Comissão padrão da venda</h3>
          <p className="ae-info-strip__description">
            A receita da venda segue as datas dos pagamentos. Esta regra apenas
            repassa a comissão registrada na venda.
          </p>
        </div>
        {standard ? (
          <div className="ae-info-strip__stats grid gap-3 sm:grid-cols-3">
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
      </section>

      <div className="grid items-stretch gap-5 xl:grid-cols-2">
        <SaleSellerOverrideCard
          {...props}
          initialSellerUserId={selectedSellerId}
        />
        <SaleExtraCommissionCard {...props} />
      </div>
    </div>
  );
}
