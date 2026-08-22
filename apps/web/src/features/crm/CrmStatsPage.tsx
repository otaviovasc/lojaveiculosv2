import { BarChart3, MessageCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { getApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmProviderConnection } from "./crmConversationTypes";
import { CrmNotice } from "./CrmNotice";
import { CrmSelect } from "./CrmFormControls";
import { CrmStatsDashboard, CrmStatsSkeleton } from "./CrmStatsParts";
import {
  addCrmStatisticsCalendarDay,
  createCrmStatisticsPresetRange,
  formatCrmStatisticsInputDate,
  parseCrmStatisticsInputDate,
  type CrmStatisticsPeriodPreset,
} from "./crmStatisticsModel";
import type { CrmStatisticsResponse } from "./crmStatisticsTypes";

const periodOptions = [
  { label: "Últimos 7 dias", value: "7d" },
  { label: "Últimos 30 dias", value: "30d" },
  { label: "Este mês", value: "month" },
  { label: "Personalizado", value: "custom" },
] satisfies ReadonlyArray<{
  label: string;
  value: CrmStatisticsPeriodPreset;
}>;

export function CrmStatsPage({
  api,
  canRead,
  connections,
}: {
  api: Pick<CrmConversationApi, "getStatistics">;
  canRead: boolean;
  connections: CrmProviderConnection[];
}) {
  const initialRange = useMemo(() => createCrmStatisticsPresetRange("30d"), []);
  const [preset, setPreset] = useState<CrmStatisticsPeriodPreset>("30d");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [connectionId, setConnectionId] = useState("");
  const [data, setData] = useState<CrmStatisticsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const requestAbortRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);
  const connectionOptions = useMemo(
    () => [
      { label: "Todos os canais", value: "" },
      ...connections.map((connection) => ({
        label: connection.displayName,
        value: String(connection.id),
      })),
    ],
    [connections],
  );
  const toExclusiveDate = toDate ? addCrmStatisticsCalendarDay(toDate) : "";
  const invalidRange =
    !fromDate ||
    !toDate ||
    fromDate > toDate ||
    new Date(`${toExclusiveDate}T12:00:00-03:00`).getTime() -
      new Date(`${fromDate}T12:00:00-03:00`).getTime() >
      366 * 24 * 60 * 60 * 1_000;

  const load = useCallback(async () => {
    if (!canRead || connections.length === 0 || invalidRange) return;
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    const generation = ++requestGenerationRef.current;
    setLoading(true);
    setError(null);
    try {
      const next = await api.getStatistics(
        {
          ...(connectionId ? { connectionId } : {}),
          from: `${fromDate}T00:00:00-03:00`,
          toExclusive: `${toExclusiveDate}T00:00:00-03:00`,
        },
        { signal: controller.signal },
      );
      if (
        generation === requestGenerationRef.current &&
        !controller.signal.aborted
      ) {
        setData(next);
      }
    } catch (caught) {
      if (
        generation === requestGenerationRef.current &&
        !controller.signal.aborted
      ) {
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      }
    } finally {
      if (generation === requestGenerationRef.current) setLoading(false);
    }
  }, [
    api,
    canRead,
    connectionId,
    connections.length,
    fromDate,
    invalidRange,
    toExclusiveDate,
  ]);

  useEffect(() => {
    void load();
    return () => requestAbortRef.current?.abort();
  }, [load]);

  if (!canRead) {
    return (
      <CrmNotice message="Seu usuário não tem permissão para visualizar as estatísticas do CRM." />
    );
  }
  if (connections.length === 0) {
    return (
      <CrmNotice message="Conecte um canal para começar a medir conversas, mensagens e atendimento." />
    );
  }
  const display = error
    ? getApiErrorDisplay(
        error,
        "Não foi possível carregar as estatísticas do CRM.",
      )
    : null;
  const isEmpty = Boolean(
    data &&
    data.summary.conversationsCreated === 0 &&
    data.messages.total === 0,
  );

  return (
    <section
      className="crm-stats"
      aria-busy={loading}
      aria-label="Estatísticas do CRM"
    >
      <header className="crm-stats-header">
        <div>
          <span className="crm-stats-eyebrow">
            <BarChart3 aria-hidden="true" /> Operação em tempo real
          </span>
          <h2>Estatísticas do CRM</h2>
          <p>
            Conversas, velocidade de resposta e desempenho comercial com dados
            reais da loja.
          </p>
        </div>
        <button
          className="crm-stats-refresh"
          disabled={loading || invalidRange}
          onClick={() => void load()}
          type="button"
        >
          <RefreshCw aria-hidden="true" />{" "}
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </header>

      <div className="crm-stats-filters">
        <div className="crm-stats-filter-field">
          <span>Período</span>
          <CrmSelect<CrmStatisticsPeriodPreset>
            ariaLabel="Período"
            onChange={(next) => {
              setPreset(next);
              if (next !== "custom") {
                const range = createCrmStatisticsPresetRange(next);
                setFromDate(range.from);
                setToDate(range.to);
              }
            }}
            options={periodOptions}
            value={preset}
          />
        </div>
        <DatePickerField
          label="De"
          maxDate={parseCrmStatisticsInputDate(toDate)}
          onChange={(date) => {
            setPreset("custom");
            setFromDate(formatCrmStatisticsInputDate(date));
          }}
          value={parseCrmStatisticsInputDate(fromDate)}
        />
        <DatePickerField
          align="right"
          label="Até"
          minDate={parseCrmStatisticsInputDate(fromDate)}
          onChange={(date) => {
            setPreset("custom");
            setToDate(formatCrmStatisticsInputDate(date));
          }}
          value={parseCrmStatisticsInputDate(toDate)}
        />
        <div className="crm-stats-filter-field">
          <span>Canal</span>
          <CrmSelect
            ariaLabel="Canal"
            onChange={setConnectionId}
            options={connectionOptions}
            value={connectionId}
          />
        </div>
      </div>

      {invalidRange ? (
        <CrmNotice message="Escolha um período válido de até 366 dias." />
      ) : null}

      {display ? (
        <CrmNotice
          actionLabel="Tentar novamente"
          message={display.message}
          onAction={() => void load()}
          {...(display.requestId ? { requestId: display.requestId } : {})}
        />
      ) : null}
      {loading && !data ? <CrmStatsSkeleton /> : null}
      {isEmpty ? (
        <div className="crm-stats-empty">
          <MessageCircle aria-hidden="true" />
          <strong>Nenhuma atividade no período</strong>
          <span>
            Ajuste o período ou o canal para consultar outros atendimentos.
          </span>
        </div>
      ) : null}
      {data && !isEmpty ? <CrmStatsDashboard data={data} /> : null}
    </section>
  );
}
