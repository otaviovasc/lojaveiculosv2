import { useState } from "react";
import type { AutoEntryDomainPanelProps } from "./domainPanelTypes";
import { AutoEntryTeamRosterCard } from "./AutoEntryTeamRosterCard";
import { SaleExtraCommissionCard } from "./SaleExtraCommissionCard";
import { SaleSellerOverrideCard } from "./SaleSellerOverrideCard";

export function SaleRulesPanel(props: AutoEntryDomainPanelProps) {
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");

  return (
    <div className="grid gap-5">
      <AutoEntryTeamRosterCard
        onSelectSeller={setSelectedSellerId}
        rules={props.rules}
        selectedSellerId={selectedSellerId}
        sellers={props.sellers}
      />

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
