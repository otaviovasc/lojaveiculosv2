import { Save, Settings2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import { parsePriceCents } from "../model/formModel";
import {
  EditListingFields,
  EditUnitFields,
  type InventoryEditState,
} from "./InventoryEditFields";
import { InventoryBadge, InventoryPanel } from "./InventoryFormParts";
import { InventoryMediaWorkspace } from "./InventoryMediaWorkspace";
import { InventoryOperationsLedger } from "./InventoryOperationsLedger";
import { InventoryWorkflowPanel } from "./InventoryWorkflowPanel";
import type { InventoryListingDetail, InventoryUnit } from "../model/types";
import { nullableRichTextDescription } from "../model/richTextDescription";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function InventoryEditPanel({
  api,
  detail,
  onUpdated,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onUpdated: (detail: InventoryListingDetail) => void;
}) {
  const primaryUnit = detail.units[0] ?? null;
  const [form, setForm] = useState(() => createEditState(detail, primaryUnit));
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const mediaCount = useMemo(() => detail.media.length, [detail.media.length]);

  useEffect(() => {
    setForm(createEditState(detail, primaryUnit));
    setSaveState({ kind: "idle" });
  }, [detail, primaryUnit]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setSaveState({ kind: "error", message: "Informe o titulo do anuncio." });
      return;
    }

    const priceCents = parsePriceCents(form.price);
    if (form.price.trim() && priceCents === null) {
      setSaveState({ kind: "error", message: "Informe um preco valido." });
      return;
    }

    setSaveState({ kind: "saving" });

    try {
      let updated = await api.updateListingDetails(detail.listing.id, {
        catalog: form.catalog,
        description: nullableRichTextDescription(form.description),
        manufactureYear: nullableNumber(form.manufactureYear),
        modelYear: nullableNumber(form.modelYear),
        priceCents,
        status: form.status,
        title: form.title.trim(),
        trimName: nullableText(form.trimName),
      });

      if (primaryUnit) {
        updated = await api.updateUnit(primaryUnit.id, {
          colorName: form.colorName || null,
          plate: nullablePlate(form.plate),
          status: form.unitStatus,
          stockNumber: nullableText(form.stockNumber),
          vin: nullableText(form.vin),
        });
      }

      onUpdated(updated);
      setSaveState({ kind: "saved" });
    } catch (error) {
      setSaveState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className="grid gap-4">
      <InventoryPanel icon={<Settings2 className="size-5" />} title="Editar">
        <form className="grid gap-4" onSubmit={(event) => void save(event)}>
          <div className="flex flex-wrap items-center gap-2">
            <InventoryBadge>{detail.listing.id}</InventoryBadge>
            <InventoryBadge tone="blue">{mediaCount} midias</InventoryBadge>
            {primaryUnit ? (
              <InventoryBadge tone="blue">{primaryUnit.id}</InventoryBadge>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <EditListingFields api={api} form={form} onChange={setForm} />
            <EditUnitFields form={form} onChange={setForm} unit={primaryUnit} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <SaveStatus state={saveState} />
            <button
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse disabled:opacity-70"
              disabled={saveState.kind === "saving"}
              type="submit"
            >
              <Save aria-hidden="true" className="size-4" />
              Salvar alteracoes
            </button>
          </div>
        </form>
      </InventoryPanel>
      <InventoryOperationsLedger
        api={api}
        detail={detail}
        onUpdated={onUpdated}
      />
      <InventoryWorkflowPanel api={api} detail={detail} onUpdated={onUpdated} />
      <InventoryMediaWorkspace
        api={api}
        detail={detail}
        onUpdated={onUpdated}
      />
    </div>
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

function createEditState(
  detail: InventoryListingDetail,
  unit: InventoryUnit | null,
): InventoryEditState {
  return {
    catalog: detail.listing.catalog,
    colorName: unit?.colorName ?? "",
    description: detail.listing.description ?? "",
    manufactureYear: detail.listing.manufactureYear
      ? String(detail.listing.manufactureYear)
      : "",
    modelYear: detail.listing.modelYear ? String(detail.listing.modelYear) : "",
    plate: unit?.plate ?? detail.listing.plate ?? "",
    price:
      detail.listing.priceCents === null
        ? ""
        : String((detail.listing.priceCents / 100).toFixed(2)).replace(
            ".",
            ",",
          ),
    status: detail.listing.status,
    stockNumber: unit?.stockNumber ?? "",
    title: detail.listing.title,
    trimName: detail.listing.trimName ?? "",
    unitStatus: unit?.status ?? "available",
    vin: unit?.vin ?? "",
  };
}

function nullablePlate(value: string): string | null {
  return nullableText(value)?.toUpperCase() ?? null;
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isInteger(number) ? number : null;
}
