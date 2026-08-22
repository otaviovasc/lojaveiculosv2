import {
  Clock,
  FilePlus2,
  FileText,
  PlugZap,
  ReceiptText,
  RefreshCcw,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { AnimatedCounter } from "../../components/ui/CountUp";
import type { FeatureIcon } from "../../components/ui/featureShared";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { cn } from "../../lib/utils";
import "../../styles/fiscal-shell.css";
import type { FiscalApi } from "./apiClient";
import { FiscalCatalogPanels } from "./FiscalCatalogPanels";
import { FiscalConnectionTab } from "./FiscalConnectionTab";
import { FiscalCorrectionPanel } from "./FiscalCorrectionPanel";
import { FiscalDocumentList } from "./FiscalDocumentList";
import { FiscalIssueComposer } from "./FiscalIssueComposer";
import { FiscalProviderPanel } from "./FiscalProviderPanel";
import { createRuntimeFiscalApi } from "./runtimeApi";
import { createIssueDraftFromDocument } from "./fiscalDocumentPrefill";
import type { FiscalStatusFilter } from "./fiscalDocumentDisplay";
import type { FiscalIssueDraft } from "./fiscalIssueModel";
import type {
  FiscalConnection,
  FiscalConnectionStatus,
  FiscalDocument,
  FiscalOverview,
} from "./types";

type FiscalTab = "catalogo" | "conexao" | "emitir" | "notas";

type LoadStatus =
  { kind: "error"; message: string } | { kind: "loading" } | { kind: "ready" };

const tabOptions: ReadonlyArray<{
  icon: typeof FileText;
  label: string;
  value: FiscalTab;
}> = [
  { icon: FileText, label: "Notas", value: "notas" },
  { icon: FilePlus2, label: "Emitir", value: "emitir" },
  { icon: PlugZap, label: "Conexão", value: "conexao" },
  { icon: Users, label: "Tomadores e modelos", value: "catalogo" },
];

const connectionChipLabels: Record<FiscalConnectionStatus, string> = {
  error: "Spedy: verificar conexão",
  not_configured: "Spedy: não configurada",
  pending_review: "Spedy: em análise",
  ready: "Spedy: emissão liberada",
};

export function FiscalModule({ api }: { api?: FiscalApi }) {
  const fiscalApi = useMemo(() => api ?? createRuntimeFiscalApi(), [api]);
  const [overview, setOverview] = useState<FiscalOverview | null>(null);
  const [connection, setConnection] = useState<FiscalConnection | null>(null);
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });
  const [tab, setTab] = useState<FiscalTab>("notas");
  const [statusFilter, setStatusFilter] = useState<FiscalStatusFilter>("all");
  const [correction, setCorrection] = useState<{
    document: FiscalDocument;
    draft: FiscalIssueDraft;
  } | null>(null);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setStatus({ kind: "loading" });
      try {
        const [nextOverview, nextConnection] = await Promise.all([
          fiscalApi.getOverview(),
          fiscalApi.getConnection(),
        ]);
        setOverview(nextOverview);
        setConnection(nextConnection);
        setStatus({ kind: "ready" });
      } catch (error) {
        setStatus({ kind: "error", message: errorMessage(error) });
      }
    },
    [fiscalApi],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reportError = (message: string) =>
    setStatus({ kind: "error", message });

  const startCorrection = (document: FiscalDocument) => {
    setCorrection({
      document,
      draft: createIssueDraftFromDocument(document),
    });
    setTab("emitir");
  };

  const handleIssued = async () => {
    setCorrection(null);
    await refresh({ silent: true });
    setTab("notas");
  };

  const toggleStatusFilter = (filter: FiscalStatusFilter) =>
    setStatusFilter((current) => (current === filter ? "all" : filter));

  const emissionReady = connection?.status === "ready";

  return (
    <FeaturePageShell className="fiscal-shell" variant="content">
      <div aria-hidden="true" className="fiscal-shell-blob" />
      <FeaturePageHeader
        actions={
          <>
            <FeatureActionButton
              icon={RefreshCcw}
              label="Atualizar"
              onClick={() => void refresh()}
              title="Atualizar dados fiscais"
            />
            <FeatureActionButton
              icon={FilePlus2}
              label="Emitir documento"
              onClick={() => setTab("emitir")}
              title="Abrir a emissão de documento fiscal"
              variant="primary"
            />
          </>
        }
        chip={
          connection ? (
            <>
              <PlugZap aria-hidden="true" className="size-3.5" />
              {connectionChipLabels[connection.status]}
            </>
          ) : undefined
        }
        className="fiscal-shell-header"
        description="Emita e acompanhe as notas fiscais vinculadas às operações reais da loja."
        eyebrow={
          <>
            <ReceiptText aria-hidden="true" className="size-4" />
            Operação fiscal
          </>
        }
        title="Notas fiscais"
      />

      {status.kind === "error" && overview ? (
        <FeatureAlert className="fiscal-shell-notice">
          {status.message}
        </FeatureAlert>
      ) : null}

      {overview && connection ? (
        <>
          {!overview.provider.configured ? (
            <FiscalProviderPanel overview={overview} />
          ) : null}

          {!emissionReady ? (
            <FeatureAlert
              action={
                <FeatureActionButton
                  icon={PlugZap}
                  label="Abrir conexão fiscal"
                  onClick={() => setTab("conexao")}
                  title="Abrir a configuração da conexão fiscal"
                />
              }
              className="fiscal-shell-notice"
              tone="warning"
            >
              A emissão está bloqueada porque a conexão fiscal ainda não está
              pronta. Conclua a configuração da empresa, do certificado e dos
              padrões fiscais.
            </FeatureAlert>
          ) : null}

          <FeatureTabs<FiscalTab>
            activeClassName="!bg-accent !text-accent-foreground"
            ariaLabel="Seções do módulo fiscal"
            className="fiscal-tabs w-full"
            onChange={setTab}
            optionClassName="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-black text-muted transition-all hover:text-app-text"
            options={tabOptions}
            value={tab}
            variant="panel"
          />

          {tab === "notas" ? (
            <div className="grid gap-4">
              <FiscalKpiGrid
                onToggle={toggleStatusFilter}
                statusFilter={statusFilter}
                summary={overview.summary}
              />
              <FiscalDocumentList
                api={fiscalApi}
                canDownloadOfficialArtifacts={
                  overview.capabilities.canDownloadOfficialArtifacts
                }
                documents={overview.documents}
                onCorrect={startCorrection}
                onError={reportError}
                onRefresh={() => refresh({ silent: true })}
                onStatusFilterChange={setStatusFilter}
                statusFilter={statusFilter}
              />
            </div>
          ) : null}

          {tab === "emitir" ? (
            <div className="grid gap-4">
              {emissionReady ? (
                <>
                  {correction ? (
                    <FiscalCorrectionPanel
                      document={correction.document}
                      draft={correction.draft}
                      onDismiss={() => setCorrection(null)}
                    />
                  ) : null}
                  <FiscalIssueComposer
                    api={fiscalApi}
                    disabled={false}
                    initialDraft={correction?.draft ?? null}
                    onError={reportError}
                    onIssued={handleIssued}
                  />
                </>
              ) : (
                <FeatureEmptyState
                  action={
                    <FeatureActionButton
                      icon={PlugZap}
                      label="Configurar conexão fiscal"
                      onClick={() => setTab("conexao")}
                      title="Ir para a configuração da conexão fiscal"
                      variant="primary"
                    />
                  }
                  body="A emissão de notas só é liberada quando a conexão com o provedor estiver pronta: empresa criada, certificado válido e padrões fiscais confirmados. Nenhuma emissão foi iniciada."
                  className="fiscal-shell-notice"
                  icon={ShieldAlert}
                  title="Emissão bloqueada"
                />
              )}
            </div>
          ) : null}

          {tab === "conexao" ? (
            <FiscalConnectionTab
              api={fiscalApi}
              connection={connection}
              onConnectionChange={setConnection}
            />
          ) : null}

          {tab === "catalogo" ? (
            <FiscalCatalogPanels api={fiscalApi} onError={reportError} />
          ) : null}
        </>
      ) : status.kind === "error" ? (
        <FeatureEmptyState
          action={
            <FeatureActionButton
              icon={RefreshCcw}
              label="Tentar carregar novamente"
              onClick={() => void refresh()}
            />
          }
          body="Não foi possível consultar a situação fiscal da loja. Nenhuma emissão foi iniciada."
          className="fiscal-shell-notice"
          icon={ShieldAlert}
          title="Operação fiscal indisponível"
        />
      ) : (
        <FeatureLoadingState title="Carregando operação fiscal">
          Consultando o provedor fiscal da loja.
        </FeatureLoadingState>
      )}
    </FeaturePageShell>
  );
}

type FiscalKpiTone = "accent" | "info" | "pink" | "violet";

function FiscalKpiGrid({
  onToggle,
  statusFilter,
  summary,
}: {
  onToggle: (filter: FiscalStatusFilter) => void;
  statusFilter: FiscalStatusFilter;
  summary: FiscalOverview["summary"];
}) {
  const kpis: ReadonlyArray<{
    filter: FiscalStatusFilter;
    icon: FeatureIcon;
    label: string;
    tone: FiscalKpiTone;
    value: number;
  }> = [
    {
      filter: "issued",
      icon: FileText,
      label: "Emitidas",
      tone: "accent",
      value: summary.issued,
    },
    {
      filter: "pending",
      icon: Clock,
      label: "Pendentes",
      tone: "info",
      value: summary.pending,
    },
    {
      filter: "cancelled",
      icon: XCircle,
      label: "Canceladas",
      tone: "pink",
      value: summary.cancelled,
    },
    {
      filter: "failed",
      icon: ShieldAlert,
      label: "Falhas",
      tone: "violet",
      value: summary.failed,
    },
  ];

  return (
    <section
      aria-label="Resumo fiscal"
      className="fiscal-kpi-grid"
      role="group"
    >
      {kpis.map(({ filter, icon: IconComponent, label, tone, value }) => {
        const active = statusFilter === filter;
        return (
          <button
            aria-label={`Filtrar por ${label}`}
            aria-pressed={active}
            className={cn(
              "fiscal-kpi-card",
              `fiscal-kpi-card--${tone}`,
              active && "is-active",
            )}
            key={filter}
            onClick={() => onToggle(filter)}
            type="button"
          >
            <IconComponent
              aria-hidden="true"
              className="fiscal-kpi-card__watermark"
            />
            <span className="fiscal-kpi-card__label">{label}</span>
            <strong className="fiscal-kpi-card__value">
              <AnimatedCounter value={value} />
            </strong>
          </button>
        );
      })}
    </section>
  );
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Não foi possível carregar o módulo fiscal.",
  );
}
