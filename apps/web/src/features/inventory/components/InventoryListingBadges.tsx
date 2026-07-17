import {
  inventoryStatusLabels,
  inventoryUnitStatusLabels,
  type InventoryDisplayStatus,
} from "../model/listCatalogModel";
import type { InventoryUnitStatus } from "../model/types";

export function StatusPill({ status }: { status: InventoryDisplayStatus }) {
  const tone =
    status === "published" || status === "available"
      ? "bg-green-soft text-success-strong border border-success-strong/25"
      : status === "in_preparation" || status === "reserved"
        ? "bg-warning/10 text-warning-strong border border-warning/25"
        : status === "sold_out" || status === "sold" || status === "delivered"
          ? "bg-blue-soft text-blue-start border border-blue-start/25"
          : status === "acquired"
            ? "bg-violet-start/10 text-violet-start border border-violet-start/25"
            : "bg-panel text-muted border border-line";

  const dotColor =
    status === "published" || status === "available"
      ? "bg-success-strong"
      : status === "in_preparation" || status === "reserved"
        ? "bg-warning-strong"
        : status === "sold_out" || status === "sold" || status === "delivered"
          ? "bg-blue-start"
          : status === "acquired"
            ? "bg-violet-start"
            : "bg-muted";
  const label = isInventoryUnitStatus(status)
    ? inventoryUnitStatusLabels[status]
    : inventoryStatusLabels[status];

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider " +
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
    <span
      aria-label={`Placa ${formatted}`}
      className="inline-flex h-7 min-w-[70px] max-w-[80px] shrink-0 select-none flex-col overflow-hidden rounded-[3px] border border-gray-300 bg-white text-center align-middle shadow-sm dark:border-line dark:bg-white"
    >
      <span className="flex h-2 shrink-0 items-center justify-center bg-blue-600 px-1 text-white dark:bg-blue-600">
        <span className="origin-center scale-50 text-xs font-black uppercase leading-none tracking-widest">
          Brasil
        </span>
      </span>
      <span className="flex h-5 items-center justify-center px-1.5 font-mono text-xs font-bold leading-none tracking-wider text-gray-900">
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
