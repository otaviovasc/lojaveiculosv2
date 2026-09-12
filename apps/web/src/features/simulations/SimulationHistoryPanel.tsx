import { useMemo, useState } from "react";
import {
  Banknote,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Eye,
  History,
  User,
  XCircle,
} from "lucide-react";
import {
  FeatureSearchField,
  FeatureSegmentedControl,
} from "../../components/ui/FeatureControls";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { FeatureTableFrame } from "../../components/ui/FeatureTable";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { simulationStatusLabel } from "./simulationPresentation";
import type { CredereSimulation } from "./types";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function SimulationHistoryPanel({
  error,
  history,
  onSelect,
  onRetry,
  selectedId,
  variant = "full",
}: {
  error: string | null;
  history: CredereSimulation[] | null;
  onSelect: (simulation: CredereSimulation) => void;
  onRetry?: (() => void) | undefined;
  selectedId?: string | null;
  variant?: "compact" | "full";
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "processing" | "refused"
  >("all");

  const counts = useMemo(() => {
    if (!history) {
      return { all: 0, available: 0, processing: 0, refused: 0 };
    }
    let available = 0;
    let processing = 0;
    let refused = 0;

    for (const item of history) {
      const s = item.status.trim().toLowerCase();
      if (
        s === "available" ||
        item.conditions.some(
          (c) => c.status === "available" || (c.firstInstallmentCents ?? 0) > 0,
        )
      ) {
        available += 1;
      } else if (
        s === "pending" ||
        s === "processing" ||
        s === "submitted" ||
        s === "requested"
      ) {
        processing += 1;
      } else if (
        s === "denied" ||
        s === "refused" ||
        s === "failed" ||
        s === "error" ||
        s === "rejected" ||
        s === "unavailable"
      ) {
        refused += 1;
      }
    }
    return { all: history.length, available, processing, refused };
  }, [history]);

  if (error) {
    return (
      <FeatureAlert
        action={
          onRetry ? (
            <FeatureActionButton
              icon={History}
              label="Tentar novamente"
              onClick={onRetry}
            />
          ) : undefined
        }
        title="Histórico indisponível"
        tone="danger"
      >
        {error}
      </FeatureAlert>
    );
  }

  if (history === null) {
    return (
      <FeatureLoadingState
        density="compact"
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
    const s = item.status.trim().toLowerCase();
    const hasAvailableOffers =
      s === "available" ||
      item.conditions.some(
        (c) => c.status === "available" || (c.firstInstallmentCents ?? 0) > 0,
      );

    if (statusFilter === "available" && !hasAvailableOffers) return false;
    if (
      statusFilter === "refused" &&
      s !== "denied" &&
      s !== "refused" &&
      s !== "failed" &&
      s !== "error" &&
      s !== "rejected" &&
      s !== "unavailable"
    )
      return false;
    if (
      statusFilter === "processing" &&
      s !== "pending" &&
      s !== "processing" &&
      s !== "submitted" &&
      s !== "requested"
    )
      return false;

    if (!search.trim()) return true;
    const query = search.toLowerCase().trim();
    const statusMatch = simulationStatusLabel(item.status)
      .toLowerCase()
      .includes(query);
    const dateMatch = formatHistoryDate(item.createdAt)
      .toLowerCase()
      .includes(query);
    const conditionsMatch = item.conditions.some((c) =>
      (c.bankName ?? "").toLowerCase().includes(query),
    );
    const clientMatch = (item.leadName ?? "").toLowerCase().includes(query);
    const vehicleMatch = (item.vehicleTitle ?? "")
      .toLowerCase()
      .includes(query);
    return (
      statusMatch || dateMatch || conditionsMatch || clientMatch || vehicleMatch
    );
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
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="flex flex-col gap-1 rounded-xl border border-line/60 bg-panel/75 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">
              Total Realizado
            </span>
            <History className="size-3.5 text-accent-strong" />
          </div>
          <span className="font-display text-2xl font-black text-app-text">
            {counts.all}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-line/60 bg-panel/75 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Com Ofertas
            </span>
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          </div>
          <span className="font-display text-2xl font-black text-app-text">
            {counts.available}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-line/60 bg-panel/75 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Em Análise
            </span>
            <Clock className="size-3.5 text-amber-500" />
          </div>
          <span className="font-display text-2xl font-black text-app-text">
            {counts.processing}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-line/60 bg-panel/75 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Sem Propostas
            </span>
            <XCircle className="size-3.5 text-muted" />
          </div>
          <span className="font-display text-2xl font-black text-app-text">
            {counts.refused}
          </span>
        </div>
      </div>

      {/* Toolbar: Search + Status Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-[240px]">
          <FeatureSearchField
            label="Buscar simulações"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por cliente, veículo, data ou propostas..."
            value={search}
          />
        </div>

        <FeatureSegmentedControl
          ariaLabel="Filtrar por status"
          onChange={setStatusFilter}
          options={[
            { label: `Todas (${counts.all})`, value: "all" },
            { label: `Com Ofertas (${counts.available})`, value: "available" },
            {
              label: `Em Análise (${counts.processing})`,
              value: "processing",
            },
            { label: `Recusadas (${counts.refused})`, value: "refused" },
          ]}
          value={statusFilter}
        />
      </div>

      {filtered.length === 0 ? (
        <FeatureEmptyState
          body="Nenhuma simulação corresponde aos filtros aplicados."
          icon={History}
          title="Nenhum resultado encontrado"
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <FeatureTableFrame>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-app-elevated/60 text-xs font-black uppercase tracking-wider text-muted">
                    <th className="p-3.5">Data e Hora</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Veículo</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Ofertas e Condições</th>
                    <th className="p-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40 font-medium">
                  {filtered.map((item) => {
                    const isSelected = item.id === selectedId;
                    const approvedOffers = item.conditions.filter(
                      (c) =>
                        c.status === "available" ||
                        (c.firstInstallmentCents ?? 0) > 0,
                    );
                    const bestOffer = approvedOffers.sort(
                      (a, b) =>
                        (a.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER) -
                        (b.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER),
                    )[0];

                    return (
                      <tr
                        className={
                          isSelected
                            ? "group bg-accent-soft/40 transition-colors hover:bg-app-elevated/50"
                            : "group transition-colors hover:bg-app-elevated/50"
                        }
                        key={item.id}
                      >
                        <td className="p-3.5">
                          <div className="inline-flex items-center gap-2">
                            <Calendar className="size-3.5 text-muted" />
                            <span className="font-semibold text-app-text">
                              {formatHistoryDate(item.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <FeatureStatusBadge
                            size="dense"
                            tone={statusTone(item.status)}
                          >
                            {simulationStatusLabel(item.status)}
                          </FeatureStatusBadge>
                        </td>
                        <td className="p-3.5">
                          <div className="inline-flex items-center gap-2">
                            <User className="size-3.5 text-muted" />
                            <span className="font-semibold text-app-text">
                              {item.leadName ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="inline-flex items-center gap-2">
                            <Car className="size-3.5 text-muted" />
                            <span className="font-semibold text-app-text">
                              {item.vehicleTitle ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {approvedOffers.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1.5 font-black text-emerald-600 dark:text-emerald-400">
                                <Banknote className="size-3.5" />
                                {bestOffer?.firstInstallmentCents
                                  ? `${formatCents(bestOffer.firstInstallmentCents)}/mês`
                                  : `${approvedOffers.length} oferta(s)`}
                              </span>
                              <span className="text-xs text-muted">
                                {approvedOffers.length} banco(s) com aprovação
                              </span>
                            </div>
                          ) : item.status.trim().toLowerCase() ===
                              "processing" ||
                            item.status.trim().toLowerCase() === "pending" ||
                            item.status.trim().toLowerCase() === "submitted" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                              <Clock className="size-3" />
                              Aguardando retorno dos bancos...
                            </span>
                          ) : (
                            <span className="text-xs text-muted">
                              Sem ofertas aprovadas
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-xs font-bold text-app-text transition-all group-hover:border-accent-strong group-hover:bg-accent-soft group-hover:text-accent-strong"
                            onClick={() => onSelect(item)}
                            type="button"
                          >
                            <Eye className="size-3.5" />
                            <span>Visualizar</span>
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
              const approvedOffers = item.conditions.filter(
                (c) =>
                  c.status === "available" ||
                  (c.firstInstallmentCents ?? 0) > 0,
              );
              const bestOffer = approvedOffers.sort(
                (a, b) =>
                  (a.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER) -
                  (b.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER),
              )[0];

              return (
                <button
                  className={
                    isSelected
                      ? "flex flex-col gap-3 rounded-2xl border-2 border-accent bg-accent-soft/30 p-4 text-left transition-all active:scale-[0.99]"
                      : "flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 text-left transition-all hover:border-line-strong active:scale-[0.99]"
                  }
                  key={item.id}
                  onClick={() => onSelect(item)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
                      <Calendar className="size-3.5" />
                      {formatHistoryDate(item.createdAt)}
                    </span>
                    <FeatureStatusBadge
                      size="dense"
                      tone={statusTone(item.status)}
                    >
                      {simulationStatusLabel(item.status)}
                    </FeatureStatusBadge>
                  </div>

                  <div className="flex flex-col gap-1 text-sm">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-app-text">
                      <User className="size-3.5 text-muted" />
                      {item.leadName ?? "—"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                      <Car className="size-3.5" />
                      {item.vehicleTitle ?? "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-line/40 pt-2 text-xs">
                    {approvedOffers.length > 0 ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {bestOffer?.firstInstallmentCents
                          ? `A partir de ${formatCents(bestOffer.firstInstallmentCents)}/mês`
                          : `${approvedOffers.length} propostas`}
                      </span>
                    ) : (
                      <span className="text-muted">Sem ofertas</span>
                    )}

                    <span className="inline-flex items-center gap-1 font-bold text-accent-strong">
                      <Eye className="size-3.5" />
                      Visualizar
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
  if (!createdAt) return "Data não informada";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatCents(cents: number | null) {
  return cents == null ? "—" : brlFormatter.format(cents / 100);
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
