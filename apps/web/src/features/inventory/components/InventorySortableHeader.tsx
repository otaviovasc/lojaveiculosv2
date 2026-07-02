import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  getInventoryColumnSortDirection,
  getNextInventoryColumnSort,
  type InventoryListSortKey,
  type InventorySortableColumn,
} from "../model/inventoryListSortModel";

export function InventorySortableHeader({
  className,
  column,
  label,
  onSortChange,
  sortBy,
}: {
  className?: string;
  column: InventorySortableColumn;
  label: string;
  onSortChange: (value: InventoryListSortKey) => void;
  sortBy: InventoryListSortKey;
}) {
  const direction = getInventoryColumnSortDirection(sortBy, column);
  const Icon =
    direction === "asc"
      ? ChevronUp
      : direction === "desc"
        ? ChevronDown
        : ArrowUpDown;

  return (
    <th
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : undefined
      }
      className={cn("px-4 py-3.5", className)}
    >
      <button
        aria-label={`Ordenar por ${label}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md text-left transition-colors hover:text-app-text focus:outline-none focus:ring-2 focus:ring-accent/30",
          direction ? "text-app-text" : "text-muted",
        )}
        onClick={() => onSortChange(getNextInventoryColumnSort(sortBy, column))}
        type="button"
      >
        <span>{label}</span>
        <Icon
          aria-hidden="true"
          className={cn("size-3", direction ? "text-accent" : "text-muted/70")}
        />
      </button>
    </th>
  );
}
