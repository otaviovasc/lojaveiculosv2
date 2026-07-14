import {
  Car,
  FileText,
  Landmark,
  ListPlus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import type { AutoEntryWorkspaceTab } from "./types";

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
  value,
}: {
  onChange: (value: AutoEntryWorkspaceTab) => void;
  value: AutoEntryWorkspaceTab;
}) {
  return (
    <FeatureTabs
      ariaLabel="Origem dos lançamentos automáticos"
      className="settings-tabs w-full overflow-x-auto"
      onChange={onChange}
      optionClassName="shrink-0"
      options={tabs}
      value={value}
    />
  );
}
