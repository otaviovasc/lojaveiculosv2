import { useState } from "react";
import { Check, Search } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CredereFipeCandidate, CredereFipeResolution } from "./types";

export function SimulationFipeResolver({
  fipeCode,
  modelYear,
  onFipeCodeChange,
  onResolve,
  onSelect,
  selected,
}: {
  fipeCode: string;
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
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const resolve = async (candidate?: CredereFipeCandidate) => {
    const year = Number(modelYear);
    if (!/^\d{6}-\d$/.test(fipeCode.trim())) {
      setError("Informe um código FIPE no formato 000000-0.");
      return;
    }
    if (!Number.isInteger(year)) {
      setError("Informe o ano-modelo antes de consultar a Credere.");
      return;
    }
    setIsResolving(true);
    setError(null);
    try {
      const resolution = await onResolve({
        fipeCode: fipeCode.trim(),
        modelYear: year,
        ...(candidate
          ? {
              selectedModelId: candidate.modelId,
              selectedMolicarCode: candidate.molicarCode,
            }
          : {}),
      });
      applyResolution(resolution, candidate, setCandidates, onSelect, setError);
    } catch (cause) {
      setError(
        formatApiErrorDisplay(
          cause,
          "Não foi possível confirmar a versão FIPE na Credere.",
        ),
      );
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <section
      aria-labelledby="credere-fipe-title"
      className="grid gap-4 border-y border-line/40 py-5"
    >
      <div>
        <h3
          className="text-sm font-semibold text-app-text"
          id="credere-fipe-title"
        >
          Correspondência FIPE e Molicar
        </h3>
        <p className="mt-1 text-xs font-medium text-muted">
          Informe a FIPE e o ano-modelo. A versão escolhida será validada
          novamente no envio da simulação.
        </p>
      </div>

      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <FeatureField label="Código FIPE">
          <FeatureInput
            aria-describedby="credere-fipe-hint"
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => {
              onFipeCodeChange(event.target.value);
              setCandidates([]);
              setError(null);
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
        <div>
          <p className="mb-2 text-xs font-semibold text-app-text">
            Escolha a versão correta antes de continuar
          </p>
          <ul aria-label="Versões Molicar disponíveis">
            {candidates.map((candidate) => (
              <li key={`${candidate.modelId}:${candidate.molicarCode}`}>
                <button
                  aria-label={`Selecionar ${candidate.version || candidate.name}, Molicar ${candidate.molicarCode}`}
                  className="flex w-full items-start justify-between gap-4 border-t border-line/50 px-1 py-3 text-left transition-colors hover:bg-app-elevated/60 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                  disabled={isResolving}
                  onClick={() => void resolve(candidate)}
                  type="button"
                >
                  <span className="min-w-0">
                    <strong className="block text-sm font-semibold text-app-text">
                      {candidate.version || candidate.name}
                    </strong>
                    {candidate.version ? (
                      <span className="mt-0.5 block text-xs font-medium text-muted">
                        Modelo Credere: {candidate.name}
                      </span>
                    ) : null}
                    <span className="mt-1 block text-xs font-medium text-muted">
                      Molicar {candidate.molicarCode}
                      {candidate.fuelType
                        ? ` · Combustível ${candidate.fuelType}`
                        : ""}
                      {yearRange(candidate)}
                    </span>
                  </span>
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 text-accent"
                  />
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
      {error ? (
        <p className="text-xs font-semibold text-danger" role="alert">
          {error}
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
    return;
  }
  onSelect(null);
  if (resolution.status === "ambiguous") {
    setCandidates(resolution.candidates);
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
