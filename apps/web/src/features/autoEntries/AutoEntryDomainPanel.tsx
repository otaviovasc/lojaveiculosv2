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
  if (tab === "financing_approved") return <FinancingRulesPanel {...props} />;
  if (tab === "transfer_documentation_charged") {
    return <DocumentationRulesPanel {...props} />;
  }
  if (tab === "insurance_issued") return <InsuranceRulesPanel {...props} />;
  if (tab === "consortium_sold") return <ConsortiumRulesPanel {...props} />;
  return <SaleRulesPanel {...props} />;
}
