import {
  AlertTriangle,
  Check,
  Copy,
  Database,
  Filter,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
  FeatureToolbar,
} from "../../components/ui/FeatureLayout";
import { FeatureInput } from "../../components/ui/FeatureControls";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import {
  createRuntimeObservabilityApi,
  type ObservabilityFilterState,
  type ObservabilityNotice,
  type ObservabilityQuery,
  type ObservabilitySnapshot,
} from "./apiClient";
import {
  EventDetailPanel,
  SummaryCards,
  TimelinePanel,
} from "./ObservabilityPanels";
import { DateFilter, SelectFilter } from "./ObservabilityFilters";

const defaultQuery: ObservabilityQuery = { limit: 50 };
const queryFields = [
  ["requestId", "Request ID"],
  ["correlationId", "Correlation ID"],
  ["action", "Action"],
  ["entityType", "Entity type"],
  ["entityId", "Entity ID"],
  ["actorId", "Actor ID"],
  ["providerName", "Provider"],
] as const;

const selectOptions = {
  outcome: [
    { label: "Todos os resultados", value: "" },
    { label: "Succeeded", value: "succeeded" },
    { label: "Failed", value: "failed" },
    { label: "Denied", value: "denied" },
  ],
  severity: [
    { label: "Todas as severidades", value: "" },
    { label: "Info", value: "info" },
    { label: "Warning", value: "warning" },
    { label: "Error", value: "error" },
    { label: "Critical", value: "critical" },
  ],
  criticality: [
    { label: "Todas as criticidades", value: "" },
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" },
    { label: "Critical", value: "critical" },
  ],
  category: [
    { label: "Todas as categorias", value: "" },
    { label: "Authentication", value: "authentication" },
    { label: "Authorization", value: "authorization" },
    { label: "Data access", value: "data_access" },
    { label: "Data change", value: "data_change" },
    { label: "Integration", value: "integration" },
    { label: "System", value: "system" },
  ],
};

export function ObservabilityPage() {
  const [filters, setFilters] =
    useState<ObservabilityFilterState>(defaultQuery);
  const [query, setQuery] = useState<ObservabilityQuery>(defaultQuery);
  const [snapshot, setSnapshot] = useState<ObservabilitySnapshot | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [notice, setNotice] = useState<ObservabilityNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const loadSnapshot = useCallback(
    async (requestedQuery: ObservabilityQuery) => {
      setIsLoading(true);
      setError(null);
      try {
        const api = await createRuntimeObservabilityApi();
        setSnapshot(await api.getHealth(requestedQuery));
      } catch (err) {
        setError(
          formatApiErrorDisplay(
            err,
            "Não foi possível carregar o diagnóstico da plataforma.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadSnapshot(query);
  }, [loadSnapshot, query, refreshToken]);

  const selectedEvent = useMemo(
    () =>
      snapshot?.events.find((event) => event.id === selectedEventId) ??
      snapshot?.events[0] ??
      null,
    [selectedEventId, snapshot],
  );

  const aiContext = useMemo(
    () =>
      JSON.stringify(
        {
          purpose: "Loja Veiculos production debugging",
          instruction:
            "Trace the requestId and correlationId first. Identify the first failed or denied event, its boundary, and the smallest safe next diagnostic step. Do not infer provider success when the audit outcome is unavailable or failed.",
          query,
          snapshot: snapshot
            ? {
                alerts: snapshot.alerts,
                generatedAt: snapshot.generatedAt,
                status: snapshot.status,
                summary: snapshot.summary,
                sinkMetrics: snapshot.sinkMetrics,
              }
            : null,
          selectedEvent,
          events: snapshot?.events.slice(0, 40) ?? [],
          failures: snapshot?.failures ?? [],
        },
        null,
        2,
      ),
    [query, selectedEvent, snapshot],
  );

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ message, tone: "success" });
    } catch {
      setNotice({
        message:
          "O navegador bloqueou a cópia. Selecione o conteúdo manualmente.",
        tone: "danger",
      });
    }
  };

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery({ ...filters, limit: filters.limit || 50 });
    setSelectedEventId(null);
  };

  const clearFilters = () => {
    setFilters(defaultQuery);
    setQuery(defaultQuery);
    setSelectedEventId(null);
  };

  return (
    <FeaturePageShell className="max-w-[1600px]" variant="plain">
      <FeaturePageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <FeatureActionButton
              icon={Copy}
              label="Copiar contexto para IA"
              onClick={() =>
                void copyText(aiContext, "Contexto de diagnóstico copiado.")
              }
              variant="primary"
            />
            <FeatureActionButton
              disabled={isLoading}
              icon={isLoading ? Loader2 : RefreshCcw}
              isBusy={isLoading}
              label="Atualizar diagnóstico"
              onClick={() => setRefreshToken((value) => value + 1)}
            />
          </div>
        }
        chip="Platform only"
        description="O ponto de partida para investigar falhas, seguir uma requisição e preparar contexto seguro para AI."
        eyebrow="Operações internas · audit + logs"
        title="Observability command center"
      />

      <FeatureAlert
        className="mb-5"
        icon={<ShieldAlert className="size-5" />}
        title="Projeção diagnóstica segura"
        tone="info"
      >
        A plataforma exibe eventos estruturados, identificadores de correlação e
        metadados permitidos. Payloads sensíveis e corpos de mensagem não entram
        neste contexto para IA.
      </FeatureAlert>

      {notice ? (
        <FeatureAlert
          className="mb-5"
          icon={
            notice.tone === "success" ? <Check className="size-5" /> : undefined
          }
          tone={notice.tone}
        >
          {notice.message}
        </FeatureAlert>
      ) : null}

      <FeatureToolbar
        className="mb-5"
        eyebrow="Consultar o audit trail por contexto operacional"
        onSubmit={submitFilters}
      >
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {queryFields.map(([key, label]) => (
            <label className="grid gap-1.5" key={key}>
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                {label}
              </span>
              <FeatureInput
                value={filters[key] ?? ""}
                onChange={(event) =>
                  setFilters((current) =>
                    updateFilter(current, key, event.target.value),
                  )
                }
              />
            </label>
          ))}
          <SelectFilter
            label="Outcome"
            options={selectOptions.outcome}
            value={filters.outcome ?? ""}
            onChange={(value) =>
              setFilters((current) => updateFilter(current, "outcome", value))
            }
          />
          <SelectFilter
            label="Severity"
            options={selectOptions.severity}
            value={filters.severity ?? ""}
            onChange={(value) =>
              setFilters((current) => updateFilter(current, "severity", value))
            }
          />
          <SelectFilter
            label="Category"
            options={selectOptions.category}
            value={filters.category ?? ""}
            onChange={(value) =>
              setFilters((current) => updateFilter(current, "category", value))
            }
          />
          <DateFilter
            label="A partir de"
            value={filters.from ?? ""}
            onChange={(value) =>
              setFilters((current) => updateFilter(current, "from", value))
            }
          />
          <DateFilter
            label="Até"
            value={filters.to ?? ""}
            onChange={(value) =>
              setFilters((current) => updateFilter(current, "to", value))
            }
          />
          <SelectFilter
            label="Criticality"
            options={selectOptions.criticality}
            value={filters.criticality ?? ""}
            onChange={(value) =>
              setFilters((current) =>
                updateFilter(current, "criticality", value),
              )
            }
          />
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-muted">
              Limite de eventos
            </span>
            <FeatureInput
              min={1}
              max={200}
              type="number"
              value={filters.limit}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  limit: Number(event.target.value) || 50,
                }))
              }
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <FeatureActionButton
            icon={Filter}
            label="Aplicar filtros"
            type="submit"
            variant="primary"
          />
          <FeatureActionButton
            icon={Search}
            label="Limpar filtros"
            onClick={clearFilters}
          />
        </div>
      </FeatureToolbar>

      {error ? (
        <FeatureAlert
          className="mb-5"
          icon={<AlertTriangle className="size-5" />}
          title="Diagnóstico indisponível"
          tone="danger"
        >
          {error}
        </FeatureAlert>
      ) : null}

      {isLoading && !snapshot ? (
        <FeatureLoadingState
          className="feature-empty-state glass-panel-branded"
          density="compact"
          icon={Loader2}
          title="Lendo audit trail e logs estruturados"
        />
      ) : snapshot ? (
        <>
          <SummaryCards snapshot={snapshot} />
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
            <TimelinePanel
              events={snapshot.events}
              selectedEventId={selectedEvent?.id ?? null}
              onSelect={setSelectedEventId}
            />
            <EventDetailPanel
              event={selectedEvent}
              aiContext={aiContext}
              onCopyEvent={(event) =>
                void copyText(
                  JSON.stringify(event, null, 2),
                  "Evento copiado para a área de transferência.",
                )
              }
              onCopyContext={() =>
                void copyText(aiContext, "Contexto de diagnóstico copiado.")
              }
            />
          </div>
        </>
      ) : (
        <FeatureEmptyState
          body="A consulta ainda não retornou uma projeção de saúde."
          icon={Database}
          title="Sem diagnóstico"
        />
      )}
    </FeaturePageShell>
  );
}

function updateFilter(
  current: ObservabilityFilterState,
  key: Exclude<keyof ObservabilityFilterState, "limit">,
  value: string,
): ObservabilityFilterState {
  const next = { ...current };
  if (value) {
    next[key] = value;
  } else {
    delete next[key];
  }
  return next;
}
