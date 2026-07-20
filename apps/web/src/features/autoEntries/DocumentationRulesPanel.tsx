import type { AutoEntryDomainPanelProps } from "./domainPanelTypes";
import { DocumentationSellerTiersCard } from "./DocumentationSellerTiersCard";
import { DocumentationStoreCard } from "./DocumentationStoreCard";

export function DocumentationRulesPanel(props: AutoEntryDomainPanelProps) {
  return (
    <div className="grid items-stretch gap-4 xl:grid-cols-2">
      <DocumentationStoreCard {...props} />
      <DocumentationSellerTiersCard {...props} />
    </div>
  );
}
