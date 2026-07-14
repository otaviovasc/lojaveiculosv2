import {
  FileText,
  Landmark,
  Percent,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { CommissionPanel } from "./SaleServicesCommissionPanel";
import { DocumentationPanel } from "./SaleServicesDocumentationPanel";
import { FinancingPanel, InsurancePanel } from "./SaleServicesPolicyPanels";
import { TradeInPanel } from "./SaleServicesTradeInPanel";
import type {
  ActiveServiceTab,
  ServiceChangeHandler,
} from "./SaleServicesTypes";
import type { SnapshotRecord } from "./salesSnapshot";
import type { SaleRecord } from "./types";

export function SaleServicesTabs({
  activeTab,
  commission,
  documentation,
  financing,
  insurance,
  onChange,
  onTabChange,
  sale,
  tradeIn,
}: {
  activeTab: ActiveServiceTab;
  commission: SnapshotRecord;
  documentation: SnapshotRecord;
  financing: SnapshotRecord;
  insurance: SnapshotRecord;
  onChange: ServiceChangeHandler;
  onTabChange: (tab: ActiveServiceTab) => void;
  sale: SaleRecord;
  tradeIn: SnapshotRecord;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-black text-muted uppercase tracking-wider block">
        3. Serviços da Venda
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <ServiceTabButton
          active={activeTab === "financing"}
          icon={<Landmark className="size-4" />}
          label="Financiamento"
          onClick={() => onTabChange("financing")}
        />
        <ServiceTabButton
          active={activeTab === "insurance"}
          icon={<ShieldCheck className="size-4" />}
          label="Seguro"
          onClick={() => onTabChange("insurance")}
        />
        <ServiceTabButton
          active={activeTab === "documentation"}
          icon={<FileText className="size-4" />}
          label="Documentação"
          onClick={() => onTabChange("documentation")}
        />
        <ServiceTabButton
          active={activeTab === "commission"}
          icon={<Percent className="size-4" />}
          label="Comissão"
          onClick={() => onTabChange("commission")}
        />
        <ServiceTabButton
          active={activeTab === "tradeIn" || !!tradeIn.enabled}
          highlighted={!!tradeIn.enabled && activeTab !== "tradeIn"}
          icon={<RefreshCw className="size-4" />}
          label="Troca (Veículo)"
          onClick={() => onTabChange("tradeIn")}
        />
      </div>

      <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm">
        {activeTab === "financing" && (
          <FinancingPanel financing={financing} onChange={onChange} />
        )}
        {activeTab === "insurance" && (
          <InsurancePanel insurance={insurance} onChange={onChange} />
        )}
        {activeTab === "documentation" && (
          <DocumentationPanel
            documentation={documentation}
            onChange={onChange}
          />
        )}
        {activeTab === "commission" && (
          <CommissionPanel commission={commission} onChange={onChange} />
        )}
        {activeTab === "tradeIn" && (
          <TradeInPanel onChange={onChange} sale={sale} tradeIn={tradeIn} />
        )}
      </div>
    </div>
  );
}

function ServiceTabButton({
  active,
  highlighted,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  highlighted?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  const buttonClassName = [
    "flex items-center gap-2 justify-center p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
    active
      ? "bg-accent-soft border-accent text-accent-strong shadow-sm"
      : "bg-panel border-line text-muted hover:bg-app-elevated/45",
    highlighted ? "ring-2 ring-success/50" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={buttonClassName} onClick={onClick} type="button">
      {icon}
      <span>{label}</span>
    </button>
  );
}
