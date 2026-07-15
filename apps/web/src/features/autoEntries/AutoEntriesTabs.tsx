import {
  Car,
  FileText,
  Landmark,
  ListPlus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import type { AutoEntryRule, AutoEntryWorkspaceTab } from "./types";

const tabs = [
  { icon: Car, label: "Venda", value: "vehicle_sale_closed" },
  { icon: Landmark, label: "Financiamento", value: "financing_approved" },
  {
    icon: FileText,
    label: "Documentação",
    value: "transfer_documentation_charged",
  },
  { icon: ShieldCheck, label: "Seguro", value: "insurance_issued" },
  { icon: Users, label: "Consórcio", value: "consortium_sold" },
  { icon: ListPlus, label: "Personalizadas", value: "custom" },
] satisfies ReadonlyArray<{
  icon: typeof Car;
  label: string;
  value: AutoEntryWorkspaceTab;
}>;

export function AutoEntriesTabs({
  onChange,
  rules,
  value,
}: {
  onChange: (value: AutoEntryWorkspaceTab) => void;
  rules: readonly AutoEntryRule[];
  value: AutoEntryWorkspaceTab;
}) {
  const activeRules = rules.filter((rule) => rule.status === "active");
  const options = tabs.map((tab) => ({
    ...tab,
    label: (
      <span className="auto-entries-tab__label">
        <span>{tab.label}</span>
        <span aria-hidden="true" className="auto-entries-tab__count">
          {countForTab(activeRules, tab.value)}
        </span>
      </span>
    ),
  }));

  return (
    <FeatureTabs
      ariaLabel="Origem dos lançamentos automáticos"
      className="auto-entries-tabs"
      onChange={onChange}
      optionClassName="auto-entries-tab"
      options={options}
      value={value}
    />
  );
}

function countForTab(
  rules: readonly AutoEntryRule[],
  tab: AutoEntryWorkspaceTab,
) {
  if (tab === "custom") {
    return rules.filter((rule) => !rule.family && !rule.ruleKey).length;
  }
  return rules.filter(
    (rule) => Boolean(rule.family || rule.ruleKey) && rule.event === tab,
  ).length;
}
