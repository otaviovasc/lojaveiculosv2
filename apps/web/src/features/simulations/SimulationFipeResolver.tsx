import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Search } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { getApiErrorDisplay } from "../../lib/apiErrors";
import type { SimulationLoadable } from "./simulationLoadable";
import type { CredereFipeCandidate, CredereFipeResolution } from "./types";

export function SimulationFipeResolver({
  fipeCode,
  invalid = false,
  modelYear,
  onFipeCodeChange,
  onResolve,
  onSelect,
  selected,
}: {
  fipeCode: string;
  invalid?: boolean;
  modelYear: string;
  onFipeCodeChange: (value: string) => void;
  onResolve: (input: {
    fipeCode: string;
    modelYear: number;
    selectedModelId?: string;
    selectedMolicarCode?: string;
  }) => Promise<CredereFipeResolution>;
  onSelect: (candidate: CredereFipeCandidate | null) => void;
  selected: CredereFipeCandidate | null;
}) {
  const [candidates, setCandidates] = useState<CredereFipeCandidate[]>([]);
  const [lookup, setLookup] = useState<SimulationLoadable<null>>({
    kind: "idle",
  });
  const isResolving = lookup.kind === "loading";
  const autoResolvedKeyRef = useRef("");

  const failLookup = (message: string, requestId?: string) =>
    setLookup({ kind: "error", message, ...(requestId ? { requestId } : {}) });

  const resolve = async (
    candidate?: CredereFipeCandidate,
    overrideFipe?: string,
    overrideYear?: number,
  ) => {
    const { normalizedFipe, year } = parseFipeYearParams(
      overrideFipe ?? fipeCode,
      overrideYear ?? modelYear,
    );
    if (!/^\d{6}-\d$/.test(normalizedFipe)) {
      failLookup("Informe um código FIPE no formato 000000-0.");
      return;
    }
    if (!Number.isInteger(year)) {
      failLookup("Informe o ano-modelo antes de consultar a Credere.");
      return;
    }
    setLookup({ kind: "loading" });
    try {
      const resolution = await onResolve({
        fipeCode: normalizedFipe,
        modelYear: year,
        ...(candidate
          ? {
              selectedModelId: candidate.modelId,
              selectedMolicarCode: candidate.molicarCode,
            }
          : {}),
      });
      applyResolution(resolution, candidate, setCandidates, onSelect, (next) =>
        next ? failLookup(next) : setLookup({ kind: "success", value: null }),
      );
    } catch (cause) {
      const display = getApiErrorDisplay(
        cause,
        "Não foi possível confirmar a versão FIPE na Credere.",
      );
      failLookup(
        display.message,
        "requestId" in display ? display.requestId : undefined,
      );
    }
  };

  useEffect(() => {
    const { normalizedFipe, year } = parseFipeYearParams(fipeCode, modelYear);
    const isValidFipe = /^\d{6}-\d$/.test(normalizedFipe);
    const isValidYear = Number.isInteger(year) && year >= 1900 && year <= 2100;

    if (isValidFipe && isValidYear && !selected) {
      const key = `${normalizedFipe}:${year}`;
      if (autoResolvedKeyRef.current !== key && lookup.kind !== "loading") {
        autoResolvedKeyRef.current = key;
        void resolve(undefined, normalizedFipe, year);
      }
    }
  }, [fipeCode, modelYear, selected, lookup.kind]);

  return (
    <section
      aria-labelledby="credere-fipe-title"
      className={`credere-form-fipe ${invalid ? "credere-form-fipe--invalid" : ""}`}
      data-invalid={invalid || undefined}
    >
      <div className="credere-form-fipe-head">
        <h3 id="credere-fipe-title">Correspondência FIPE e Molicar</h3>
        <p>
          Informe a FIPE e o ano-modelo. A versão escolhida será validada
          novamente no envio da simulação.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
        <FeatureField
          error={
            invalid && !selected ? "Confirme a versão FIPE/Molicar" : undefined
          }
          label="Código FIPE"
        >
          <FeatureInput
            aria-describedby="credere-fipe-hint"
            className="credere-form-input credere-form-input--code"
            data-invalid={invalid && !selected ? "true" : undefined}
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => {
              onFipeCodeChange(event.target.value);
              setCandidates([]);
              setLookup({ kind: "idle" });
              onSelect(null);
            }}
            placeholder="000000-0"
            value={fipeCode}
          />
        </FeatureField>
        <FeatureActionButton
          disabled={!fipeCode.trim() || !modelYear.trim()}
          icon={Search}
          isBusy={isResolving}
          label={isResolving ? "Consultando Credere" : "Consultar Credere"}
          onClick={() => void resolve()}
        />
      </div>
      <p className="sr-only" id="credere-fipe-hint">
        Formato esperado: seis números, hífen e um dígito verificador.
      </p>

      {candidates.length > 0 ? (
        <div className="credere-form-fipe-candidates">
          <p className="credere-form-fipe-candidates-title">
            Escolha a versão correta antes de continuar
          </p>
          <ul
            aria-label="Versões Molicar disponíveis"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {candidates.map((candidate) => (
              <li key={`${candidate.modelId}:${candidate.molicarCode}`}>
                <button
                  aria-label={`Selecionar ${candidate.version || candidate.name}, Molicar ${candidate.molicarCode}`}
                  className="credere-form-fipe-candidate"
                  disabled={isResolving}
                  onClick={() => void resolve(candidate)}
                  type="button"
                >
                  <span className="credere-form-fipe-candidate-body">
                    <strong>{candidate.version || candidate.name}</strong>
                    {candidate.version ? (
                      <span className="credere-form-fipe-candidate-model">
                        Modelo Credere: {candidate.name}
                      </span>
                    ) : null}
                    <span className="credere-form-fipe-candidate-meta">
                      Molicar {candidate.molicarCode}
                      {candidate.fuelType
                        ? ` · Combustível ${candidate.fuelType}`
                        : ""}
                      {yearRange(candidate)}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="credere-form-fipe-candidate-check"
                  >
                    <Check />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {selected ? (
        <FeatureAlert title="Versão confirmada na Credere" tone="success">
          {selected.version || selected.name} · Molicar {selected.molicarCode}
          {selected.fuelType ? ` · ${selected.fuelType}` : ""}
        </FeatureAlert>
      ) : null}
      {lookup.kind === "error" ? (
        <p className="credere-form-error" role="alert">
          <CircleAlert aria-hidden="true" />
          <span>
            {lookup.message}
            {lookup.requestId ? (
              <span className="credere-form-error-id">
                ID do erro: {lookup.requestId}
              </span>
            ) : null}
          </span>
        </p>
      ) : null}
    </section>
  );
}

function applyResolution(
  resolution: CredereFipeResolution,
  requested: CredereFipeCandidate | undefined,
  setCandidates: (value: CredereFipeCandidate[]) => void,
  onSelect: (candidate: CredereFipeCandidate | null) => void,
  setError: (value: string | null) => void,
) {
  if (resolution.status === "resolved") {
    setCandidates([]);
    onSelect(resolution.candidate);
    setError(null);
    return;
  }
  onSelect(null);
  if (resolution.status === "ambiguous") {
    setCandidates(resolution.candidates);
    setError(null);
    return;
  }
  setCandidates(resolution.status === "mismatch" ? resolution.candidates : []);
  setError(
    resolution.status === "mismatch" && requested
      ? "A versão mudou ou deixou de corresponder à FIPE. Consulte e escolha novamente."
      : "A Credere não encontrou uma versão Molicar disponível para esta FIPE e ano-modelo.",
  );
}

function yearRange(candidate: CredereFipeCandidate) {
  if (candidate.yearStart === null && candidate.yearEnd === null) return "";
  return ` · Anos ${candidate.yearStart ?? "início não informado"}–${candidate.yearEnd ?? "atual"}`;
}

function parseFipeYearParams(fipe: string, yearValue: string | number) {
  const rawFipe = String(fipe).trim();
  const normalizedFipe = /^\d{7}$/.test(rawFipe)
    ? `${rawFipe.slice(0, 6)}-${rawFipe.slice(6)}`
    : rawFipe;
  const year = Number(yearValue);
  return { normalizedFipe, year };
}
