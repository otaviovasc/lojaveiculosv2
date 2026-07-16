import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ExternalLink, Plus, RotateCcw } from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureDrawer } from "../../components/ui/FeatureOverlay";
import {
  FeatureAlert,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { InventoryApi } from "../inventory/api/apiClient";
import { DocumentosChecklistEditor } from "../inventory/components/DocumentosChecklistEditor";
import {
  checklistInputItems,
  checklistStatus,
  deliveryChecklistName,
  deliveryChecklistTemplate,
} from "../inventory/components/DocumentosChecklistModel";
import type { InventoryChecklistOverviewItem } from "../inventory/model/checklistOverviewTypes";
import type {
  InventoryChecklistItemStatus,
  UpsertInventoryChecklistItemInput,
} from "../inventory/model/types";
import {
  checklistOverviewStatusLabel,
  checklistOverviewStatusTone,
  checklistVehicleSubtitle,
  isChecklistItemResolved,
} from "./checklistModuleModel";
import {
  getVehicleColorLabel,
  getVehicleColorSwatch,
} from "@lojaveiculosv2/shared";

export function ChecklistOverviewDrawer({
  api,
  canUpdate,
  item,
  onClose,
  onDownload,
  onOpenInventory,
  onUpdated,
}: {
  api: InventoryApi;
  canUpdate: boolean;
  item: InventoryChecklistOverviewItem | null;
  onClose: () => void;
  onDownload: (item: InventoryChecklistOverviewItem) => void;
  onOpenInventory: (item: InventoryChecklistOverviewItem) => void;
  onUpdated: () => Promise<void>;
}) {
  const [checklistId, setChecklistId] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousUnitId = useRef<string | null>(null);
  const checklist =
    item?.checklists.find((entry) => entry.id === checklistId) ??
    item?.checklists[0];

  useEffect(() => {
    const nextUnitId = item?.unit.id ?? null;
    const unitChanged = previousUnitId.current !== nextUnitId;
    setChecklistId((currentId) => {
      if (unitChanged) return item?.checklists[0]?.id ?? "";
      return item?.checklists.some((entry) => entry.id === currentId)
        ? currentId
        : (item?.checklists[0]?.id ?? "");
    });
    if (unitChanged) {
      setNewItemText("");
      setError(null);
    }
    previousUnitId.current = nextUnitId;
  }, [item]);

  const checklistOptions = useMemo(
    () =>
      item?.checklists.map((entry) => ({
        label: entry.name,
        value: entry.id,
      })) ?? [],
    [item?.checklists],
  );

  async function createChecklist() {
    if (!canUpdate || !item) return;
    await runSave(async () => {
      await api.createChecklist(item.unit.id, {
        items: deliveryChecklistTemplate,
        name: deliveryChecklistName,
        status: "pending",
      });
    }, "Não foi possível criar o checklist de entrega.");
  }

  async function updateItems(items: UpsertInventoryChecklistItemInput[]) {
    if (!canUpdate || !item || !checklist) return;
    await runSave(async () => {
      await api.updateChecklist(item.unit.id, checklist.id, {
        items,
        status: checklistStatus(items),
      });
    }, "Não foi possível atualizar o checklist.");
  }

  async function runSave(action: () => Promise<void>, fallback: string) {
    setSaving(true);
    setError(null);
    try {
      await action();
      await onUpdated();
    } catch (caught) {
      setError(formatApiErrorDisplay(caught, fallback));
    } finally {
      setSaving(false);
    }
  }

  const items = checklist ? checklistInputItems(checklist.items) : [];

  return (
    <FeatureDrawer
      className="!max-w-2xl"
      footer={
        item ? (
          <div className="flex w-full flex-wrap justify-end gap-2">
            <FeatureActionButton
              icon={ExternalLink}
              label="Abrir no estoque"
              onClick={() => onOpenInventory(item)}
            />
            <FeatureActionButton
              icon={Download}
              label="Baixar PDF"
              onClick={() => onDownload(item)}
              variant="primary"
            />
          </div>
        ) : null
      }
      isOpen={Boolean(item)}
      onClose={onClose}
      title={item?.listing.title ?? "Checklist"}
    >
      {item ? (
        <div aria-busy={saving} className="space-y-5">
          <div className="rounded-xl border border-line bg-app/30 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-app-text">
                  {item.listing.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-bold text-muted">
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
                    {checklistVehicleSubtitle({
                      ...item.listing,
                      ...item.unit,
                    }) || "Sem identificação complementar"}
                  </span>
                </div>
              </div>
              <FeatureStatusBadge
                tone={checklistOverviewStatusTone(item.status)}
              >
                {checklistOverviewStatusLabel(item.status)}
              </FeatureStatusBadge>
            </div>
            <div className="mt-3.5 border-t border-line/50 pt-3">
              <div className="flex items-center justify-between text-xs font-bold text-muted mb-1.5">
                <span>Progresso do checklist</span>
                <span className="text-app-text font-extrabold">
                  {item.metrics.resolvedItemCount} de {item.metrics.itemCount}{" "}
                  resolvidos ({item.metrics.progressPercent}%)
                </span>
              </div>
              <div className="checklist-progress-bar-container">
                <span
                  className={`checklist-progress-bar ${item.metrics.progressPercent === 100 ? "checklist-progress-bar--complete" : item.metrics.failedItemCount > 0 ? "checklist-progress-bar--failed" : ""}`}
                  style={{ width: `${item.metrics.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {error ? <FeatureAlert>{error}</FeatureAlert> : null}

          {!checklist ? (
            <div className="rounded-xl border border-dashed border-line bg-app/20 p-5 text-center">
              <p className="text-sm font-bold text-muted">
                Esta unidade ainda não possui checklist. Crie o modelo de
                entrega para começar.
              </p>
              <FeatureActionButton
                className="mt-4"
                disabled={!canUpdate}
                icon={Plus}
                isBusy={saving}
                label="Criar checklist de entrega"
                onClick={() => void createChecklist()}
                variant="primary"
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="min-w-56 flex-1">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-muted">
                    Checklist
                  </span>
                  <FeatureSelect
                    ariaLabel="Checklist selecionado"
                    disabled={saving}
                    onChange={setChecklistId}
                    options={checklistOptions}
                    value={checklist.id}
                  />
                </label>
                <FeatureActionButton
                  disabled={!canUpdate}
                  icon={RotateCcw}
                  isBusy={saving}
                  label="Resetar itens"
                  onClick={() =>
                    void updateItems(
                      items.map((entry) => ({ ...entry, status: "pending" })),
                    )
                  }
                />
              </div>
              <DocumentosChecklistEditor
                checklist={checklist}
                disabled={saving || !canUpdate}
                newItemText={newItemText}
                onAdd={() => {
                  const label = newItemText.trim();
                  if (!label) return;
                  setNewItemText("");
                  void updateItems([...items, { label, status: "pending" }]);
                }}
                onChangeNewItem={setNewItemText}
                onDelete={(itemId) =>
                  void updateItems(items.filter((entry) => entry.id !== itemId))
                }
                onNotesChange={(itemId, notes) =>
                  void updateItems(
                    items.map((entry) =>
                      entry.id === itemId ? { ...entry, notes } : entry,
                    ),
                  )
                }
                onStatusChange={(
                  itemId,
                  status: InventoryChecklistItemStatus,
                ) =>
                  void updateItems(
                    items.map((entry) =>
                      entry.id === itemId ? { ...entry, status } : entry,
                    ),
                  )
                }
                onToggle={(itemId) =>
                  void updateItems(
                    items.map((entry) =>
                      entry.id === itemId
                        ? {
                            ...entry,
                            status: isChecklistItemResolved(entry)
                              ? "pending"
                              : "passed",
                          }
                        : entry,
                    ),
                  )
                }
              />
            </>
          )}
        </div>
      ) : null}
    </FeatureDrawer>
  );
}
