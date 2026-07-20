import { cx } from "../../components/ui/featureShared";
import { formatFinanceCategory } from "./financeBillsFormat";

export function FinanceCategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={cx(
        "finance-category-badge",
        `finance-category-badge--${categoryTone(category)}`,
      )}
      title={formatFinanceCategory(category)}
    >
      {formatFinanceCategory(category)}
    </span>
  );
}

function categoryTone(category: string) {
  if (category === "sales_commission" || category === "manual_bonus") {
    return "blue";
  }
  if (category === "rent" || category === "traffic") return "warning";
  return "neutral";
}
