import { History } from "lucide-react";
import {
  FeatureAlert,
  FeatureLoadingState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import type { CredereSimulation } from "./types";
import { simulationStatusLabel } from "./simulationPresentation";

export function SimulationHistoryPanel({
  error,
  history,
  onSelect,
  selectedId,
}: {
  error: string | null;
  history: CredereSimulation[] | null;
  onSelect: (simulation: CredereSimulation) => void;
  selectedId?: string | null;
}) {
  return (
    <section
      aria-labelledby="credere-history-title"
      className="credere-history"
    >
      <header className="credere-history-header">
        <History aria-hidden="true" className="size-4" />
        <h3 id="credere-history-title">Histórico</h3>
      </header>
      {error ? (
        <FeatureAlert tone="danger">{error}</FeatureAlert>
      ) : history === null ? (
        <FeatureLoadingState density="compact" title="Carregando histórico" />
      ) : history.length === 0 ? (
        <p className="text-sm font-semibold text-muted">
          Nenhuma simulação registrada para esta loja.
        </p>
      ) : (
        <ul className="credere-history-list">
          {history.map((item) => (
            <li key={item.id}>
              <button
                aria-current={item.id === selectedId ? "true" : undefined}
                className="credere-history-row"
                onClick={() => onSelect(item)}
                type="button"
              >
                <span>{formatHistoryDate(item.createdAt)}</span>
                <FeatureStatusBadge size="dense" tone="neutral">
                  {simulationStatusLabel(item.status)}
                </FeatureStatusBadge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatHistoryDate(createdAt: string | null) {
  if (!createdAt) return "Simulação";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Simulação";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
