import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  PencilLine,
} from "lucide-react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import {
  FeatureRowAction,
  FeatureRowActions,
  FeatureTableFrame,
} from "../../components/ui/FeatureTable";
import type { InventoryChecklistOverviewItem } from "../inventory/model/checklistOverviewTypes";
import {
  checklistOverviewStatusLabel,
  checklistOverviewStatusTone,
  checklistVehicleSubtitle,
  formatChecklistDate,
  inventoryUnitStatusLabel,
  inventoryUnitStatusTone,
} from "./checklistModuleModel";
import {
  getVehicleColorLabel,
  getVehicleColorSwatch,
} from "@lojaveiculosv2/shared";

type ChecklistSortKey =
  | "veiculo"
  | "estoque"
  | "situacao"
  | "progresso"
  | "pendencias"
  | "atualizado";
type SortDirection = "asc" | "desc";

interface SortableHeaderProps {
  column: ChecklistSortKey;
  label: string;
  sortBy: ChecklistSortKey;
  sortDir: SortDirection;
  onSort: (column: ChecklistSortKey) => void;
}

function SortableHeader({
  column,
  label,
  sortBy,
  sortDir,
  onSort,
}: SortableHeaderProps) {
  const isSorted = sortBy === column;
  const Icon = !isSorted
    ? ArrowUpDown
    : sortDir === "asc"
      ? ChevronUp
      : ChevronDown;

  return (
    <th className="px-4 py-3 font-black">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1.5 hover:text-app-text transition-colors focus:outline-none focus:text-app-text select-none text-xs font-black uppercase tracking-wider"
      >
        <span>{label}</span>
        <Icon
          className={
            "size-3.5 transition-colors " +
            (isSorted ? "text-accent" : "text-muted/50 hover:text-muted")
          }
        />
      </button>
    </th>
  );
}

export function ChecklistOverviewTable({
  busyUnitId,
  items,
  onDownload,
  onEdit,
  onOpenInventory,
  sortBy,
  sortDir,
  onSort,
}: {
  busyUnitId: string | null;
  items: readonly InventoryChecklistOverviewItem[];
  onDownload: (item: InventoryChecklistOverviewItem) => void;
  onEdit: (item: InventoryChecklistOverviewItem) => void;
  onOpenInventory: (item: InventoryChecklistOverviewItem) => void;
  sortBy: ChecklistSortKey;
  sortDir: SortDirection;
  onSort: (column: ChecklistSortKey) => void;
}) {
  return (
    <>
      <FeatureTableFrame className="hidden md:block">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead className="border-b border-line bg-app/45 text-xs uppercase tracking-wider text-muted">
            <tr>
              <SortableHeader
                column="veiculo"
                label="Veículo"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                column="estoque"
                label="Estoque"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                column="situacao"
                label="Situação"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                column="progresso"
                label="Progresso"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                column="pendencias"
                label="Pendências"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                column="atualizado"
                label="Atualizado em"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <th className="px-4 py-3 font-black w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {items.map((item) => (
              <ChecklistRow
                busy={busyUnitId === item.unit.id}
                item={item}
                key={item.unit.id}
                onDownload={onDownload}
                onEdit={onEdit}
                onOpenInventory={onOpenInventory}
              />
            ))}
          </tbody>
        </table>
      </FeatureTableFrame>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:hidden">
        {items.map((item) => (
          <ChecklistCard
            busy={busyUnitId === item.unit.id}
            item={item}
            key={item.unit.id}
            onDownload={onDownload}
            onEdit={onEdit}
            onOpenInventory={onOpenInventory}
          />
        ))}
      </div>
    </>
  );
}

type RowProps = {
  busy: boolean;
  item: InventoryChecklistOverviewItem;
  onDownload: (item: InventoryChecklistOverviewItem) => void;
  onEdit: (item: InventoryChecklistOverviewItem) => void;
  onOpenInventory: (item: InventoryChecklistOverviewItem) => void;
};

function getFailedItemsList(item: InventoryChecklistOverviewItem) {
  const failed = item.checklists
    .flatMap((c) => c.items)
    .filter((i) => i.status === "failed");
  if (failed.length === 0) return null;
  return failed.map((i) => i.label);
}

function ChecklistRow(props: RowProps) {
  const { item } = props;
  return (
    <tr className="checklist-table-row transition-colors">
      <td className="px-4 py-3">
        <strong className="block text-app-text font-extrabold">
          {item.listing.title}
        </strong>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
          {item.unit.colorName && (
            <span className="vehicle-card-accent-badge flex items-center gap-1.5">
              {getVehicleColorSwatch(item.unit.colorName) && (
                <span
                  className="inline-block size-2 rounded-full border border-line-strong"
                  style={{
                    backgroundColor: getVehicleColorSwatch(
                      item.unit.colorName,
                    )!,
                  }}
                />
              )}
              <span>
                {getVehicleColorLabel(item.unit.colorName) ||
                  item.unit.colorName}
              </span>
            </span>
          )}
          <span>
            {checklistVehicleSubtitle({ ...item.listing, ...item.unit }) ||
              "Sem identificação complementar"}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <FeatureStatusBadge
          size="dense"
          tone={inventoryUnitStatusTone(item.unit.status)}
        >
          {inventoryUnitStatusLabel(item.unit.status)}
        </FeatureStatusBadge>
      </td>
      <td className="px-4 py-3">
        <FeatureStatusBadge tone={checklistOverviewStatusTone(item.status)}>
          {checklistOverviewStatusLabel(item.status)}
        </FeatureStatusBadge>
      </td>
      <td className="px-4 py-3">
        <ChecklistProgress item={item} />
      </td>
      <td className="px-4 py-3 text-xs font-bold text-muted">
        {item.metrics.failedItemCount ? (
          <div className="space-y-1">
            <span className="text-danger flex items-center gap-1 font-extrabold">
              <span className="size-1.5 rounded-full bg-danger" />
              {item.metrics.failedItemCount} reprovados
            </span>
            <div
              className="max-w-[200px] truncate text-xs font-semibold text-danger/80"
              title={getFailedItemsList(item)?.join(", ")}
            >
              {getFailedItemsList(item)?.slice(0, 2).join(", ")}
              {getFailedItemsList(item) && getFailedItemsList(item)!.length > 2
                ? "..."
                : ""}
            </div>
          </div>
        ) : (
          <span className="text-muted/65 font-medium">0 reprovados</span>
        )}
        <span className="block mt-1 font-medium">
          {item.metrics.pendingItemCount} pendentes
        </span>
      </td>
      <td className="px-4 py-3 text-xs font-bold text-muted">
        {formatChecklistDate(item.updatedAt)}
      </td>
      <td className="px-4 py-3">
        <RowActions {...props} />
      </td>
    </tr>
  );
}

function ChecklistCard(props: RowProps) {
  const { item } = props;
  const failedList = getFailedItemsList(item);
  return (
    <article className="rounded-2xl border border-line bg-panel p-4 hover:border-line-strong transition-colors duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block truncate text-sm text-app-text font-extrabold">
            {item.listing.title}
          </strong>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
            {item.unit.colorName && (
              <span className="vehicle-card-accent-badge flex items-center gap-1.5">
                {getVehicleColorSwatch(item.unit.colorName) && (
                  <span
                    className="inline-block size-2 rounded-full border border-line-strong"
                    style={{
                      backgroundColor: getVehicleColorSwatch(
                        item.unit.colorName,
                      )!,
                    }}
                  />
                )}
                <span>
                  {getVehicleColorLabel(item.unit.colorName) ||
                    item.unit.colorName}
                </span>
              </span>
            )}
            <span>
              {checklistVehicleSubtitle({ ...item.listing, ...item.unit })}
            </span>
          </div>
        </div>
        <FeatureStatusBadge
          size="dense"
          tone={checklistOverviewStatusTone(item.status)}
        >
          {checklistOverviewStatusLabel(item.status)}
        </FeatureStatusBadge>
      </div>
      <div className="mt-4">
        <ChecklistProgress item={item} />
      </div>

      {failedList && failedList.length > 0 && (
        <div className="mt-3 rounded-lg border border-danger/10 bg-danger/5 p-2 text-xs font-semibold text-danger">
          <span className="font-extrabold block mb-0.5">
            Pendências críticas:
          </span>
          <span className="text-danger/80">
            {failedList.slice(0, 3).join(" · ")}
            {failedList.length > 3 ? "..." : ""}
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs font-bold text-muted border-t border-line/45 pt-3">
        <span>
          {item.metrics.pendingItemCount} pendentes ·{" "}
          {item.metrics.failedItemCount} reprovados
        </span>
        <FeatureStatusBadge
          size="dense"
          tone={inventoryUnitStatusTone(item.unit.status)}
        >
          {inventoryUnitStatusLabel(item.unit.status)}
        </FeatureStatusBadge>
      </div>
      <div className="mt-1">
        <RowActions {...props} />
      </div>
    </article>
  );
}

function ChecklistProgress({ item }: { item: InventoryChecklistOverviewItem }) {
  const isComplete = item.metrics.progressPercent === 100;
  const hasFailures = item.metrics.failedItemCount > 0;

  let progressClass = "checklist-progress-bar";
  if (isComplete) {
    progressClass += " checklist-progress-bar--complete";
  } else if (hasFailures) {
    progressClass += " checklist-progress-bar--failed";
  }

  return (
    <div className="min-w-28">
      <div className="mb-1 flex justify-between text-xs font-black text-app-text">
        <span className="font-extrabold">{item.metrics.progressPercent}%</span>
        <span className="text-muted font-medium">
          {item.metrics.resolvedItemCount}/{item.metrics.itemCount}
        </span>
      </div>
      <div className="checklist-progress-bar-container">
        <span
          className={progressClass}
          style={{ width: `${item.metrics.progressPercent}%` }}
        />
      </div>
    </div>
  );
}

function RowActions(props: RowProps) {
  return (
    <FeatureRowActions className="mt-3 md:mt-0">
      <FeatureRowAction
        ariaLabel="Editar checklist"
        icon={PencilLine}
        onClick={() => props.onEdit(props.item)}
        tooltip="Editar"
      />
      <FeatureRowAction
        ariaLabel="Baixar checklist em PDF"
        disabled={props.busy}
        icon={Download}
        onClick={() => props.onDownload(props.item)}
        tooltip="Baixar PDF"
      />
      <FeatureRowAction
        ariaLabel="Abrir veículo no estoque"
        icon={ExternalLink}
        onClick={() => props.onOpenInventory(props.item)}
        tooltip="Abrir veículo"
      />
    </FeatureRowActions>
  );
}
