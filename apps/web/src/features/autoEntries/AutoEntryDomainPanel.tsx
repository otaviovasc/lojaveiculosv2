import {
  Car,
  FileText,
  Landmark,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { ConsortiumRulesPanel } from "./ConsortiumRulesPanel";
import { DocumentationRulesPanel } from "./DocumentationRulesPanel";
import type { AutoEntryDomainPanelProps } from "./domainPanelTypes";
import { FinancingRulesPanel } from "./FinancingRulesPanel";
import { InsuranceRulesPanel } from "./InsuranceRulesPanel";
import { SaleRulesPanel } from "./SaleRulesPanel";
import type { AutoEntryWorkspaceTab } from "./types";

export function AutoEntryDomainPanel({
  tab,
  ...props
}: AutoEntryDomainPanelProps & {
  tab: Exclude<AutoEntryWorkspaceTab, "custom">;
}) {
  const content = panelForTab(tab, props);
  const meta = domainMeta[tab];
  const Icon = meta.icon;
  const headingId = `auto-entry-domain-${tab}`;

  return (
    <section aria-labelledby={headingId} className="auto-entries-domain">
      <div className="auto-entries-domain__heading">
        <span className="auto-entries-domain__icon">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="auto-entries-domain__eyebrow">Origem automática</p>
          <h2 className="auto-entries-domain__title" id={headingId}>
            {meta.title}
          </h2>
          <p className="auto-entries-domain__description">{meta.description}</p>
        </div>
      </div>
      {content}
    </section>
  );
}

function panelForTab(
  tab: Exclude<AutoEntryWorkspaceTab, "custom">,
  props: AutoEntryDomainPanelProps,
): ReactNode {
  if (tab === "financing_approved") return <FinancingRulesPanel {...props} />;
  if (tab === "transfer_documentation_charged") {
    return <DocumentationRulesPanel {...props} />;
  }
  if (tab === "insurance_issued") return <InsuranceRulesPanel {...props} />;
  if (tab === "consortium_sold") return <ConsortiumRulesPanel {...props} />;
  return <SaleRulesPanel {...props} />;
}

const domainMeta: Record<
  Exclude<AutoEntryWorkspaceTab, "custom">,
  { description: string; icon: LucideIcon; title: string }
> = {
  consortium_sold: {
    description:
      "Distribua a remuneração da carta entre a loja e o vendedor responsável.",
    icon: Users,
    title: "Consórcio vendido",
  },
  financing_approved: {
    description:
      "Organize a receita da loja e a comissão por vendedor nas faixas R1–R5.",
    icon: Landmark,
    title: "Financiamento aprovado",
  },
  insurance_issued: {
    description:
      "Defina a participação da loja e do vendedor quando a apólice for emitida.",
    icon: ShieldCheck,
    title: "Seguro emitido",
  },
  transfer_documentation_charged: {
    description:
      "Registre custos, receita e faixas de comissão da documentação cobrada.",
    icon: FileText,
    title: "Documentação de transferência",
  },
  vehicle_sale_closed: {
    description:
      "Mantenha a receita principal no fechamento e modele as comissões auxiliares.",
    icon: Car,
    title: "Venda concluída",
  },
};
