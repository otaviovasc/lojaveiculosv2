import type { ReactNode } from "react";
import { FeatureToneIcon } from "../../components/ui/FeatureToneIcon";
import { cx } from "../../components/ui/featureShared";
import { AutoEntryRulesOverview } from "./AutoEntryRulesOverview";
import { ConsortiumRulesPanel } from "./ConsortiumRulesPanel";
import { DocumentationRulesPanel } from "./DocumentationRulesPanel";
import { autoEntryMetaForTab } from "./domainMeta";
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
  const meta = autoEntryMetaForTab(tab);
  const Icon = meta.icon;
  const headingId = `auto-entry-domain-${tab}`;

  return (
    <section
      aria-labelledby={headingId}
      className={cx("auto-entries-domain", `ae-tone--${meta.tone}`)}
    >
      <div className="auto-entries-domain__heading">
        <FeatureToneIcon icon={Icon} size="lg" />
        <div className="min-w-0">
          <h2 className="auto-entries-domain__title" id={headingId}>
            {meta.title}
          </h2>
          <p className="auto-entries-domain__description">{meta.description}</p>
        </div>
        <span className="auto-entries-domain__pill">{meta.tab}</span>
      </div>
      {panelForTab(tab, props)}
      <AutoEntryRulesOverview
        event={tab}
        rules={props.rules}
        sellers={props.sellers}
      />
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
