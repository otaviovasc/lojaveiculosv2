import { Save, Settings2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import { inventoryStatusLabels } from "../model/listCatalogModel";
import { EditListingFields, EditUnitFields } from "./InventoryEditFields";
import { InventoryBadge, InventoryPanel } from "./InventoryFormParts";
import type { InventoryListingDetail } from "../model/types";
import {
  buildListingEditInput,
  buildUnitEditInput,
  createInventoryEditState,
  validateInventoryEditState,
} from "../model/inventoryEditModel";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function InventoryEditPanel({
  api,
  detail,
  onCancel,
  onSaved,
  onUpdated,
  unitId,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onCancel?: () => void;
  onSaved?: (detail: InventoryListingDetail) => void;
  onUpdated: (detail: InventoryListingDetail) => void;
  unitId?: string | null;
}) {
  const primaryUnit =
    detail.units.find((unit) => unit.id === unitId) ?? detail.units[0] ?? null;
  const [form, setForm] = useState(() =>
    createInventoryEditState(detail, primaryUnit),
  );
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const mediaCount = useMemo(() => detail.media.length, [detail.media.length]);

  useEffect(() => {
    setForm(createInventoryEditState(detail, primaryUnit));
    setSaveState({ kind: "idle" });
  }, [detail, primaryUnit]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validateInventoryEditState(form);
    if (validationMessage) {
      setSaveState({ kind: "error", message: validationMessage });
      return;
    }

    setSaveState({ kind: "saving" });

    try {
      const listingInput = buildListingEditInput(form, detail.listing);
      let updated = listingInput
        ? await api.updateListingDetails(detail.listing.id, listingInput)
        : detail;

      if (primaryUnit) {
        const unitInput = buildUnitEditInput(form, primaryUnit);
        if (unitInput)
          updated = await api.updateUnit(primaryUnit.id, unitInput);
      }

      onUpdated(updated);
      setSaveState({ kind: "saved" });
      onSaved?.(updated);
    } catch (error) {
      setSaveState({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Nao foi possivel salvar o estoque.",
        ),
      });
    }
  };

  return (
    <InventoryPanel
      icon={<Settings2 className="size-5" />}
      title="Editar veículo"
    >
      <form className="grid gap-4" onSubmit={(event) => void save(event)}>
        <div className="flex flex-wrap items-center gap-2">
          <InventoryBadge>
            {inventoryStatusLabels[detail.listing.status]}
          </InventoryBadge>
          <InventoryBadge tone="blue">{mediaCount} midias</InventoryBadge>
          {primaryUnit ? (
            <InventoryBadge tone="blue">
              {primaryUnit.stockNumber ?? primaryUnit.plate ?? "Unidade"}
            </InventoryBadge>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <EditListingFields api={api} form={form} onChange={setForm} />
          <EditUnitFields form={form} onChange={setForm} unit={primaryUnit} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SaveStatus state={saveState} />
          <div className="flex flex-wrap gap-2">
            {onCancel ? (
              <button
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-black text-app-text"
                disabled={saveState.kind === "saving"}
                onClick={onCancel}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
                Cancelar
              </button>
            ) : null}
            <button
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse disabled:opacity-70"
              disabled={saveState.kind === "saving"}
              type="submit"
            >
              <Save aria-hidden="true" className="size-4" />
              Salvar alterações
            </button>
          </div>
        </div>
      </form>
    </InventoryPanel>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state.kind === "error") {
    return <p className="text-sm font-black text-danger">{state.message}</p>;
  }

  if (state.kind === "saved") {
    return (
      <p className="text-sm font-black text-accent-strong">
        Alteracoes salvas.
      </p>
    );
  }

  if (state.kind === "saving") {
    return <p className="text-sm font-black text-muted">Salvando.</p>;
  }

  return (
    <p className="text-sm font-bold text-muted">Auditoria por campo ativa.</p>
  );
}
