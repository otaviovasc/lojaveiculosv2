import { useState, type Dispatch, type SetStateAction } from "react";
import { LoaderCircle, Search, Sparkles } from "lucide-react";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryFormState } from "../model/formModel";
import {
  applyPlateLookupToForm,
  createResaleAnalysisInput,
  hasEnoughDataForAnalysis,
} from "../model/inventoryEnrichment";
import type {
  InventoryPlateLookupResponse,
  InventoryResaleAnalysisResponse,
} from "../model/enrichmentTypes";
import { InventoryField, InventoryInput } from "./InventoryFormParts";
import {
  AnalysisPanel,
  LookupStatus,
  type Loadable,
} from "./InventoryCreateEnrichmentParts";

export function InventoryCreateEnrichmentPanel({
  api,
  form,
  onSetFormDirect,
}: {
  api: InventoryApi | null;
  form: InventoryFormState;
  onSetFormDirect: Dispatch<SetStateAction<InventoryFormState>>;
}) {
  const [scanPlate, setScanPlate] = useState(form.plate);
  const [plateState, setPlateState] = useState<
    Loadable<InventoryPlateLookupResponse>
  >({ kind: "idle" });
  const [analysisState, setAnalysisState] = useState<
    Loadable<InventoryResaleAnalysisResponse>
  >({ kind: "idle" });
  const lookup = plateState.kind === "success" ? plateState.value : null;
  const canAnalyze = api && hasEnoughDataForAnalysis(form, lookup);

  const runAnalysis = async (
    analysisForm = form,
    analysisLookup = lookup,
    applyDescription = true,
  ) => {
    if (!api) return;
    setAnalysisState({ kind: "loading" });
    try {
      const analysis = await api.analyzeResale(
        createResaleAnalysisInput(analysisForm, analysisLookup),
      );
      setAnalysisState({ kind: "success", value: analysis });
      if (applyDescription) {
        onSetFormDirect((current) =>
          current.description.trim()
            ? current
            : { ...current, description: analysis.suggestedDescription },
        );
      }
    } catch (error) {
      setAnalysisState({ kind: "error", message: errorMessage(error) });
    }
  };

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
    setAnalysisState({ kind: "idle" });
    try {
      const result = await api.lookupPlate({ plate });
      const filledForm = applyPlateLookupToForm(form, result);
      onSetFormDirect((current) => applyPlateLookupToForm(current, result));
      setPlateState({ kind: "success", value: result });
      if (hasEnoughDataForAnalysis(filledForm, result)) {
        await runAnalysis(filledForm, result);
      }
    } catch (error) {
      setPlateState({ kind: "error", message: errorMessage(error) });
    }
  };

  return (
    <section className="glass-panel-branded flex flex-col gap-5 rounded-2xl border border-line bg-panel p-6 shadow-[var(--shadow-panel)]">
      <header className="flex flex-col gap-1 border-b border-line pb-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-app-text">
          <span className="grid size-8 place-items-center rounded-md bg-accent-soft text-accent-strong border border-accent-soft/20">
            <Sparkles className="size-4" />
          </span>
          Início Rápido
        </h3>
        <p className="text-xs font-bold text-muted">
          Consulte a placa, revise o preenchimento e gere a análise comercial.
        </p>
      </header>

      <InventoryField label="Placa do Veículo">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <InventoryInput
            className="w-full font-mono tracking-widest sm:text-center"
            onChange={(event) => setScanPlate(event.target.value.toUpperCase())}
            placeholder="Ex: abc1d23"
            value={scanPlate}
          />
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-xs font-black text-inverse transition-all hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-75"
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
      </InventoryField>

      <LookupStatus state={plateState} />
      <AnalysisPanel
        canAnalyze={Boolean(canAnalyze)}
        onGenerate={() => void runAnalysis(form, lookup, false)}
        state={analysisState}
      />
    </section>
  );
}

function normalizePlate(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function isBrazilianPlate(value: string) {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
