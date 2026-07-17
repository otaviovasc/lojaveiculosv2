import { useEffect, useState } from "react";
import {
  Clock,
  Database,
  LoaderCircle,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { FeatureActionButton } from "../../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import type {
  InventoryAuditEvent,
  InventoryListingDetail,
} from "../model/types";
import { buildInventoryHistoryEvents } from "./InventoryDetailHistoryModel";

export function InventoryDetailHistoricoTab({
  api,
  detail,
  onUpdated,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onUpdated: (detail: InventoryListingDetail) => void;
}) {
  const events = buildInventoryHistoryEvents(detail);
  const analysis = detail.listing.resaleAnalysis;
  const [auditEvents, setAuditEvents] = useState<
    readonly InventoryAuditEvent[]
  >([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingAudit(true);
    setAuditError(null);
    void api
      .listListingAuditEvents(detail.listing.id)
      .then((result) => {
        if (!cancelled) setAuditEvents(result);
      })
      .catch((caught) => {
        if (!cancelled) {
          setAuditError(
            formatApiErrorDisplay(
              caught,
              "Não foi possível carregar o trilho de auditoria.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAudit(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, detail.listing.id]);

  async function generateAnalysis() {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const updated = await api.analyzeListingResale(detail.listing.id);
      onUpdated(updated);
      setAuditError(null);
      try {
        setAuditEvents(await api.listListingAuditEvents(detail.listing.id));
      } catch (caught) {
        setAuditError(
          formatApiErrorDisplay(
            caught,
            "A análise foi salva, mas o trilho de auditoria não foi atualizado.",
          ),
        );
      }
    } catch (caught) {
      setAnalysisError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível gerar a análise deste veículo.",
        ),
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-6 text-app-text">
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-line pb-3 sm:flex-row sm:items-center">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <Sparkles className="size-4 shrink-0 text-accent" />
            <span>Insights de IA</span>
          </h3>
          <FeatureActionButton
            icon={isAnalyzing ? LoaderCircle : analysis ? RefreshCcw : Sparkles}
            isBusy={isAnalyzing}
            label={analysis ? "Atualizar análise" : "Gerar análise"}
            onClick={() => void generateAnalysis()}
            variant="secondary"
          />
        </div>

        {analysisError ? <FeatureAlert>{analysisError}</FeatureAlert> : null}
        {analysis ? (
          <div className="grid gap-4">
            <div className="grid divide-y divide-line/60 overflow-hidden rounded-xl border border-line sm:grid-cols-[160px_minmax(0,1fr)] sm:divide-x sm:divide-y-0">
              <div className="bg-app/20 p-4">
                <p className="text-xs font-bold text-muted">Risco comercial</p>
                <p className="mt-1 text-3xl font-black text-app-text">
                  {analysis.dealRiskScore}
                  <span className="text-sm text-muted">/100</span>
                </p>
                <p className="mt-1 text-xs font-black uppercase text-accent-strong">
                  {riskLabel(analysis.riskLevel)}
                </p>
              </div>
              <div className="p-4">
                <p className="text-sm font-black text-app-text">
                  {analysis.summary}
                </p>
                <p className="mt-3 text-xs font-bold text-muted">
                  Gerada por {providerLabel(analysis.provider.name)} ·{" "}
                  {analysis.provider.model} em{" "}
                  {formatDateTime(analysis.generatedAt)}
                </p>
              </div>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {analysis.topics.map((topic, index) => (
                <li
                  className="rounded-lg bg-app/40 p-3"
                  key={`${topic.code}-${topic.title}-${index}`}
                >
                  <p className="text-xs font-black text-app-text">
                    {topic.title}
                  </p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
                    {topic.message}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-5 text-xs font-bold leading-relaxed text-muted">
            Gere a primeira análise para registrar uma leitura de giro, mercado
            e risco vinculada a este veículo.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
        <div className="border-b border-line pb-3">
          <h3 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider">
            <Clock className="size-4 shrink-0 text-muted" />
            <span>Histórico operacional</span>
          </h3>
        </div>
        <ol className="relative flex flex-col gap-5 border-l border-line/60 pl-4">
          {events.map((event) => (
            <li key={event.id} className="relative flex flex-col gap-1 text-xs">
              <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border border-panel bg-accent" />
              <span className="font-black text-app-text">{event.title}</span>
              <span className="font-bold text-muted">{event.detail}</span>
              <time
                className="font-bold text-muted"
                dateTime={event.occurredAt}
              >
                {event.formattedDate}
              </time>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Database className="size-4 shrink-0 text-muted" />
          <h3 className="text-sm font-black uppercase tracking-wider">
            Trilho de auditoria
          </h3>
        </div>
        {auditError ? <FeatureAlert>{auditError}</FeatureAlert> : null}
        {isLoadingAudit ? (
          <p className="flex items-center gap-2 text-xs font-bold text-muted">
            <LoaderCircle className="size-4 animate-spin" />
            Carregando eventos auditados...
          </p>
        ) : auditEvents.length ? (
          <ol className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
            {auditEvents.map((event) => (
              <li
                className="grid gap-1 bg-app/10 p-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto]"
                key={event.id}
              >
                <div>
                  <p className="font-black text-app-text">
                    {auditActionLabel(event.action)}
                  </p>
                  <p className="font-bold text-muted">
                    {event.summary ?? event.action} · {actorLabel(event)}
                    {event.providerName
                      ? ` · ${providerLabel(event.providerName)}`
                      : ""}{" "}
                    · {auditOutcomeLabel(event.outcome)}
                  </p>
                </div>
                <time
                  className="font-bold text-muted"
                  dateTime={event.occurredAt}
                >
                  {formatDateTime(event.occurredAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-5 text-xs font-bold text-muted">
            Nenhuma alteração auditada foi registrada para este veículo.
          </p>
        )}
      </section>
    </div>
  );
}

function riskLabel(level: "high" | "low" | "medium") {
  return level === "high" ? "Alto" : level === "medium" ? "Médio" : "Baixo";
}

function providerLabel(name: string) {
  return name.toLowerCase() === "openai" ? "OpenAI" : name;
}

function actorLabel(event: InventoryAuditEvent) {
  const label =
    event.actorKind === "user"
      ? "Operador"
      : event.actorKind === "system"
        ? "Sistema"
        : event.actorKind === "integration"
          ? "Integração"
          : "Acesso público";
  return `${label} ${event.actorId.slice(0, 12)}`;
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    "vehicle_document.attach": "Documento anexado",
    "documents.download": "Documento visualizado ou baixado",
    "vehicle_listing.create": "Veículo cadastrado",
    "vehicle_listing.details.update": "Dados do veículo alterados",
    "vehicle_listing.publication.publish": "Anúncio publicado",
    "vehicle_listing.publication.unpublish": "Anúncio retirado da vitrine",
    "vehicle_listing.resale_analysis.generate": "Análise comercial gerada",
    "vehicle_listing.status.change": "Status do veículo alterado",
    "vehicle_media.create": "Mídia adicionada",
    "vehicle_media.delete": "Mídia removida",
    "vehicle_media.update": "Mídia alterada",
    "vehicle_unit.update": "Unidade física alterada",
  };
  return labels[action] ?? action.replaceAll("_", " ").replaceAll(".", " · ");
}

function auditOutcomeLabel(outcome: InventoryAuditEvent["outcome"]) {
  const labels: Record<InventoryAuditEvent["outcome"], string> = {
    attempted: "Tentativa",
    denied: "Negado",
    failed: "Falhou",
    succeeded: "Concluído",
  };
  return labels[outcome];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
