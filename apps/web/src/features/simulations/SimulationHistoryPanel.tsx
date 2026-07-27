import { History } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureLoadingState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import type { CredereSimulation } from "./types";

export function SimulationHistoryPanel({
  error,
  history,
  onSelect,
}: {
  error: string | null;
  history: CredereSimulation[] | null;
  onSelect: (simulation: CredereSimulation) => void;
}) {
  return (
    <FeatureSection
      icon={<History aria-hidden="true" className="size-4" />}
      title="Histórico"
    >
      {error ? (
        <FeatureAlert tone="danger">{error}</FeatureAlert>
      ) : history === null ? (
        <FeatureLoadingState density="compact" title="Carregando histórico" />
      ) : history.length === 0 ? (
        <p className="text-sm font-semibold text-muted">
          Nenhuma simulação registrada para esta loja.
        </p>
      ) : (
        <ul className="grid gap-2">
          {history.map((item) => (
            <li key={item.id}>
              <button
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2 text-left text-xs font-bold text-app-text"
                onClick={() => onSelect(item)}
                type="button"
              >
                <span>{formatHistoryDate(item.createdAt)}</span>
                <FeatureStatusBadge size="dense" tone="neutral">
                  {item.status}
                </FeatureStatusBadge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </FeatureSection>
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
