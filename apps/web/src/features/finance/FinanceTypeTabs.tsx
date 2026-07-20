import { HandCoins, List, Receipt, TrendingUp } from "lucide-react";
import { FeatureSegmentedControl } from "../../components/ui/FeatureControls";
import { financeTypeLabels } from "./FinanceFormParts";
import type { FinanceEntryType } from "./types";

const financeTypes: (FinanceEntryType | "all")[] = [
  "all",
  "expense",
  "revenue",
  "commission",
];

const typeIcons = {
  all: List,
  commission: HandCoins,
  expense: Receipt,
  revenue: TrendingUp,
} satisfies Record<FinanceEntryType | "all", typeof Receipt>;

const tabLabels: Record<FinanceEntryType | "all", string> = {
  all: "Todos",
  ...financeTypeLabels,
};

export function FinanceTypeTabs({
  activeType,
  counts,
  onTypeChange,
}: {
  activeType: FinanceEntryType | "all";
  counts?: Record<FinanceEntryType, number>;
  onTypeChange: (type: FinanceEntryType | "all") => void;
}) {
  return (
    <FeatureSegmentedControl
      ariaLabel="Tipos"
      onChange={onTypeChange}
      options={financeTypes.map((type) => ({
        icon: typeIcons[type],
        label: (
          <span className="inline-flex items-center gap-1.5">
            {tabLabels[type]}
            {counts ? (
              <span aria-hidden="true" className="finance-type-tab__count">
                {type === "all"
                  ? counts.expense + counts.revenue + counts.commission
                  : counts[type]}
              </span>
            ) : null}
          </span>
        ),
        value: type,
      }))}
      value={activeType}
    />
  );
}
