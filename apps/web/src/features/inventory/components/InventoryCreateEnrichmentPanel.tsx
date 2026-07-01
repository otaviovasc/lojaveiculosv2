import { useState, type Dispatch, type SetStateAction } from "react";
import { LoaderCircle, Search, Sparkles } from "lucide-react";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryFormState } from "../model/formModel";
import { applyPlateLookupToForm } from "../model/inventoryEnrichment";
import type { InventoryPlateLookupResponse } from "../model/enrichmentTypes";
import { InventoryInput } from "./InventoryFormParts";
import { LookupStatus, type Loadable } from "./InventoryCreateEnrichmentParts";
import { getApiErrorDisplay } from "../../../lib/apiErrors";

export function InventoryCreateEnrichmentPanel({
  api,
  form,
  onLookupComplete,
  onSetFormDirect,
}: {
  api: InventoryApi | null;
  form: InventoryFormState;
  onLookupComplete: (result: InventoryPlateLookupResponse) => void;
  onSetFormDirect: Dispatch<SetStateAction<InventoryFormState>>;
}) {
  const [scanPlate, setScanPlate] = useState(form.plate);
  const [plateState, setPlateState] = useState<
    Loadable<InventoryPlateLookupResponse>
  >({ kind: "idle" });

  const handleLookup = async () => {
    const plate = normalizePlate(scanPlate);
    if (!api) {
      setPlateState({ kind: "error", message: "API ainda carregando." });
      return;
    }
    if (!isBrazilianPlate(plate)) {
      setPlateState({ kind: "error", message: "Informe uma placa valida." });
      return;
    }

    setPlateState({ kind: "loading" });
    try {
      const result = await api.lookupPlate({ plate });
      onSetFormDirect((current) => applyPlateLookupToForm(current, result));
      setPlateState({ kind: "success", value: result });
      onLookupComplete(result);
    } catch (error) {
      setPlateState({
        kind: "error",
        ...getApiErrorDisplay(
          error,
          "Nao foi possivel consultar a placa agora.",
        ),
      });
    }
  };

  return (
    <section className="glass-panel-branded flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5 shadow-[var(--shadow-panel)]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-strong border border-accent-soft/20">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-wider text-app-text">
              Início Rápido
            </h3>
            <p className="text-xs font-bold text-muted">
              Consulte a placa e revise o preenchimento.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2 sm:min-w-0 sm:flex-1 sm:max-w-md">
          <InventoryInput
            className="w-full font-mono tracking-widest sm:text-center"
            onChange={(event) => setScanPlate(event.target.value.toUpperCase())}
            placeholder="Ex: abc1d23"
            value={scanPlate}
          />
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-xs font-black text-inverse transition-all hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-75 whitespace-nowrap shrink-0"
            disabled={plateState.kind === "loading"}
            onClick={() => void handleLookup()}
            type="button"
          >
            {plateState.kind === "loading" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            <span>Consultar placa</span>
          </button>
        </div>
      </header>

      <LookupStatus state={plateState} />
    </section>
  );
}

function normalizePlate(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function isBrazilianPlate(value: string) {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(value);
}
