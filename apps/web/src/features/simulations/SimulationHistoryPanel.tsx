import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  History,
  Search,
} from "lucide-react";
import {
  FeatureInput,
  FeatureSegmentedControl,
} from "../../components/ui/FeatureControls";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { FeatureTableFrame } from "../../components/ui/FeatureTable";
import { simulationStatusLabel } from "./simulationPresentation";
import type { CredereSimulation } from "./types";

export function SimulationHistoryPanel({
  error,
  history,
  onSelect,
  selectedId,
  variant = "full",
}: {
  error: string | null;
  history: CredereSimulation[] | null;
  onSelect: (simulation: CredereSimulation) => void;
  selectedId?: string | null;
  variant?: "compact" | "full";
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "processing" | "refused"
  >("all");

  if (error) {
    return <FeatureAlert tone="danger">{error}</FeatureAlert>;
  }

  if (history === null) {
    return (
      <FeatureLoadingState
        density="comfortable"
        title="Carregando histórico de simulações..."
      />
    );
  }

  if (history.length === 0) {
    return (
      <FeatureEmptyState
        body="Realize a primeira simulação oficial no Credere para acompanhar o histórico da loja."
        icon={History}
        title="Nenhuma simulação registrada"
      />
    );
  }

  const filtered = history.filter((item) => {
    if (statusFilter === "available" && item.status !== "available")
      return false;
    if (
      statusFilter === "refused" &&
      item.status !== "denied" &&
      item.status !== "refused" &&
      item.status !== "failed"
    )
      return false;
    if (
      statusFilter === "processing" &&
      item.status !== "pending" &&
      item.status !== "processing" &&
      item.status !== "submitted"
    )
      return false;

    if (!search.trim()) return true;
    const query = search.toLowerCase().trim();
    const idMatch = item.id.toLowerCase().includes(query);
    const statusMatch = simulationStatusLabel(item.status)
      .toLowerCase()
      .includes(query);
    const dateMatch = formatHistoryDate(item.createdAt)
      .toLowerCase()
      .includes(query);
    return idMatch || statusMatch || dateMatch;
  });

  if (variant === "compact") {
    return (
      <section
        aria-labelledby="credere-history-title"
        className="credere-history"
      >
        <header className="credere-history-header">
          <History aria-hidden="true" className="size-4 text-accent-strong" />
          <h3 id="credere-history-title" className="font-bold">
            Histórico
          </h3>
        </header>
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
                <FeatureStatusBadge size="dense" tone={statusTone(item.status)}>
                  {simulationStatusLabel(item.status)}
                </FeatureStatusBadge>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-[260px]">
          <FeatureInput
            className="pl-10"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por código da simulação, data ou status..."
            value={search}
          />
          <Search
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
        </div>

        <FeatureSegmentedControl
          ariaLabel="Filtrar por status"
          onChange={setStatusFilter}
          options={[
            { label: `Todos (${history.length})`, value: "all" },
            { label: "Disponíveis", value: "available" },
            { label: "Em processamento", value: "processing" },
            { label: "Recusadas", value: "refused" },
          ]}
          value={statusFilter}
        />
      </div>

      {filtered.length === 0 ? (
        <FeatureEmptyState
          body="Nenhuma simulação corresponde aos filtros aplicados."
          icon={History}
          title="Nenhum resultado"
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <FeatureTableFrame>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-app-elevated/50 text-xs font-bold uppercase tracking-wider text-muted">
                    <th className="p-3.5">ID / Ref</th>
                    <th className="p-3.5">Data da Consulta</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Condições</th>
                    <th className="p-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40 font-medium">
                  {filtered.map((item) => {
                    const isSelected = item.id === selectedId;
                    return (
                      <tr
                        className={
                          isSelected
                            ? "group bg-accent-soft/40 transition-colors hover:bg-app-elevated/40"
                            : "group transition-colors hover:bg-app-elevated/40"
                        }
                        key={item.id}
                      >
                        <td className="p-3.5 font-mono text-xs font-bold text-app-text">
                          {item.id.slice(0, 18)}...
                        </td>
                        <td className="p-3.5 text-xs text-muted">
                          {formatHistoryDate(item.createdAt)}
                        </td>
                        <td className="p-3.5">
                          <FeatureStatusBadge
                            size="dense"
                            tone={statusTone(item.status)}
                          >
                            {simulationStatusLabel(item.status)}
                          </FeatureStatusBadge>
                        </td>
                        <td className="p-3.5 text-xs font-semibold text-app-text">
                          {item.conditions.length > 0
                            ? `${item.conditions.length} oferta(s) retornada(s)`
                            : "Sem ofertas no momento"}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-xs font-bold text-app-text transition-colors group-hover:border-accent-strong group-hover:bg-accent-soft group-hover:text-accent-strong"
                            onClick={() => onSelect(item)}
                            type="button"
                          >
                            <span>Visualizar</span>
                            <ArrowRight className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </FeatureTableFrame>
          </div>

          {/* Mobile Cards View */}
          <div className="grid gap-3 md:hidden">
            {filtered.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={
                    isSelected
                      ? "flex flex-col gap-2 rounded-2xl border border-accent bg-accent-soft/30 p-4 text-left transition-all active:scale-[0.99]"
                      : "flex flex-col gap-2 rounded-2xl border border-line bg-panel p-4 text-left transition-all hover:border-line-strong active:scale-[0.99]"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-app-text">
                      {item.id.slice(0, 16)}...
                    </span>
                    <FeatureStatusBadge
                      size="dense"
                      tone={statusTone(item.status)}
                    >
                      {simulationStatusLabel(item.status)}
                    </FeatureStatusBadge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {formatHistoryDate(item.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-accent">
                      {item.conditions.length > 0
                        ? `${item.conditions.length} ofertas`
                        : "Ver detalhes"}
                      <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
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

function statusTone(status: string) {
  switch (status.trim().toLowerCase()) {
    case "available":
      return "success" as const;
    case "denied":
    case "error":
    case "failed":
    case "refused":
    case "rejected":
    case "unavailable":
      return "danger" as const;
    case "pending":
    case "processing":
    case "submitted":
    case "requested":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}
