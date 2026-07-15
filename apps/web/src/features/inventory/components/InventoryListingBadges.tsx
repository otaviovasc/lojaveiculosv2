import {
  inventoryStatusLabels,
  inventoryUnitStatusLabels,
  type InventoryDisplayStatus,
} from "../model/listCatalogModel";
import type { InventoryUnitStatus } from "../model/types";

export function StatusPill({ status }: { status: InventoryDisplayStatus }) {
  const tone =
    status === "published" || status === "available"
      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
      : status === "in_preparation" || status === "reserved"
        ? "bg-warning/10 text-warning border border-warning/20"
        : status === "sold_out" || status === "sold" || status === "delivered"
          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
          : status === "acquired"
            ? "bg-violet-500/10 text-violet-500 border border-violet-500/20"
            : "bg-panel text-muted border border-line";

  const dotColor =
    status === "published" || status === "available"
      ? "bg-emerald-500"
      : status === "in_preparation" || status === "reserved"
        ? "bg-warning"
        : status === "sold_out" || status === "sold" || status === "delivered"
          ? "bg-blue-500"
          : status === "acquired"
            ? "bg-violet-500"
            : "bg-muted";
  const label = isInventoryUnitStatus(status)
    ? inventoryUnitStatusLabels[status]
    : inventoryStatusLabels[status];

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-md " +
        tone
      }
    >
      <span className={"size-1.5 rounded-full " + dotColor} />
      {label}
    </span>
  );
}

export function MercosulPlateBadge({ plate }: { plate: string }) {
  if (!plate || plate === "-") {
    return <span className="text-muted text-xs">-</span>;
  }

  const formatted = plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return (
    <span className="inline-flex align-middle flex-col overflow-hidden rounded-[3px] border border-gray-300 dark:border-line bg-white dark:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] min-w-[70px] max-w-[80px] text-center select-none shrink-0">
      <span className="bg-blue-600 px-1 py-0.5 text-xs font-black uppercase leading-none tracking-widest text-center text-white dark:bg-blue-600">
        Brasil
      </span>
      <span className="px-1.5 py-0.5 font-mono text-xs font-bold leading-none tracking-wider text-gray-900">
        {formatted}
      </span>
    </span>
  );
}

function isInventoryUnitStatus(
  status: InventoryDisplayStatus,
): status is InventoryUnitStatus {
  return status in inventoryUnitStatusLabels;
}
