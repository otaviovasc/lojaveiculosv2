import { useState } from "react";
import { ClipboardCheck, RotateCcw } from "lucide-react";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import type {
  InventoryListingDetail,
  InventoryUnit,
  UpsertInventoryChecklistItemInput,
} from "../model/types";
import { DocumentosChecklistEditor } from "./DocumentosChecklistEditor";
import {
  checklistInputItems,
  checklistStatus,
  deliveryChecklistName,
  deliveryChecklistTemplate,
  findDeliveryChecklist,
} from "./DocumentosChecklistModel";

type Props = {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onUpdated: (detail: InventoryListingDetail) => void;
  unit: InventoryUnit | null;
};

export function DocumentosChecklistCard({
  api,
  detail,
  onUpdated,
  unit,
}: Props) {
  const checklist = unit
    ? findDeliveryChecklist(detail.checklists, unit.id)
    : undefined;
  const [newItemText, setNewItemText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createChecklist() {
    if (!unit) return;
    setIsSaving(true);
    setError(null);
    try {
      onUpdated(
        await api.createChecklist(unit.id, {
          items: deliveryChecklistTemplate,
          name: deliveryChecklistName,
          status: "pending",
        }),
      );
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível criar o checklist de entrega.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateItems(items: UpsertInventoryChecklistItemInput[]) {
    if (!unit || !checklist) return;
    setIsSaving(true);
    setError(null);
    try {
      onUpdated(
        await api.updateChecklist(unit.id, checklist.id, {
          items,
          status: checklistStatus(items),
        }),
      );
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível atualizar o checklist de entrega.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const items = checklist ? checklistInputItems(checklist.items) : [];
  const completedCount = checklist?.items.filter(
    (item) => item.status === "passed" || item.status === "waived",
  ).length;
  const failedCount = checklist?.items.filter(
    (item) => item.status === "failed",
  ).length;

  return (
    <section
      aria-busy={isSaving}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5"
    >
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-1.5">
          <ClipboardCheck className="size-4.5 shrink-0 text-accent" />
          <h3 className="text-sm font-black uppercase tracking-wider">
            Checklist de entrega
          </h3>
        </div>
        {checklist ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-muted">
              {completedCount}/{checklist.items.length} resolvidos
              {failedCount ? ` · ${failedCount} reprovados` : ""}
            </span>
            <button
              aria-label="Resetar checklist"
              className="rounded bg-transparent p-1 text-muted transition-colors hover:bg-line/25 hover:text-accent-text disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isSaving}
              onClick={() =>
                void updateItems(
                  items.map((item) => ({ ...item, status: "pending" })),
                )
              }
              title="Resetar checklist"
              type="button"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs font-bold text-danger">
          {error}
        </p>
      ) : null}

      {!unit ? (
        <p className="text-xs font-bold text-muted">
          Selecione uma unidade física para consultar o checklist.
        </p>
      ) : !checklist ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-line bg-app/20 p-4">
          <p className="text-xs font-bold text-muted">
            Nenhum checklist de entrega foi registrado para esta unidade.
          </p>
          <button
            className="min-h-9 rounded-lg bg-accent px-4 text-xs font-black text-accent-foreground transition-colors hover:bg-accent-strong hover:text-accent-strong-foreground disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isSaving}
            onClick={() => void createChecklist()}
            type="button"
          >
            {isSaving ? "Criando..." : "Criar checklist de entrega"}
          </button>
        </div>
      ) : (
        <DocumentosChecklistEditor
          checklist={checklist}
          disabled={isSaving}
          newItemText={newItemText}
          onAdd={() => {
            const label = newItemText.trim();
            if (!label) return;
            setNewItemText("");
            void updateItems([...items, { label, status: "pending" }]);
          }}
          onChangeNewItem={setNewItemText}
          onDelete={(itemId) =>
            void updateItems(items.filter((item) => item.id !== itemId))
          }
          onNotesChange={(itemId, notes) =>
            void updateItems(
              items.map((item) =>
                item.id === itemId ? { ...item, notes } : item,
              ),
            )
          }
          onStatusChange={(itemId, status) =>
            void updateItems(
              items.map((item) =>
                item.id === itemId ? { ...item, status } : item,
              ),
            )
          }
          onToggle={(itemId) =>
            void updateItems(
              items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      status:
                        item.status === "passed" || item.status === "waived"
                          ? "pending"
                          : "passed",
                    }
                  : item,
              ),
            )
          }
        />
      )}
    </section>
  );
}
