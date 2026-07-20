import {
  Clock,
  FilePlus2,
  FileText,
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
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { FiscalApi } from "./apiClient";
import { FiscalCatalogPanels } from "./FiscalCatalogPanels";
import { FiscalCorrectionPanel } from "./FiscalCorrectionPanel";
import { FiscalDocumentList } from "./FiscalDocumentList";
import { FiscalIssueComposer } from "./FiscalIssueComposer";
import { FiscalProviderPanel } from "./FiscalProviderPanel";
import { createRuntimeFiscalApi } from "./runtimeApi";
import { createIssueDraftFromDocument } from "./fiscalDocumentPrefill";
import type { FiscalStatusFilter } from "./fiscalDocumentDisplay";
import type { FiscalIssueDraft } from "./fiscalIssueModel";
import type { FiscalDocument, FiscalOverview } from "./types";

type FiscalTab = "catalogo" | "emitir" | "notas";

type LoadStatus =
  { kind: "error"; message: string } | { kind: "loading" } | { kind: "ready" };

const tabOptions: ReadonlyArray<{
  icon: typeof FileText;
  label: string;
  value: FiscalTab;
}> = [
  { icon: FileText, label: "Notas", value: "notas" },
  { icon: FilePlus2, label: "Emitir", value: "emitir" },
  { icon: Users, label: "Tomadores e modelos", value: "catalogo" },
];

export function FiscalModule({ api }: { api?: FiscalApi }) {
  const fiscalApi = useMemo(() => api ?? createRuntimeFiscalApi(), [api]);
  const [overview, setOverview] = useState<FiscalOverview | null>(null);
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
        setOverview(await fiscalApi.getOverview());
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

  const emissionDisabled = !overview?.provider.configured;

  return (
    <FeaturePageShell mainClassName="feature-shell">
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
        description="Emita e acompanhe as notas fiscais vinculadas às operações reais da loja."
        eyebrow="Operação fiscal"
        title="Notas fiscais"
      />

      {status.kind === "error" && overview ? (
        <FeatureAlert>{status.message}</FeatureAlert>
      ) : null}

      {overview ? (
        <>
          {!overview.provider.configured ? (
            <FiscalProviderPanel overview={overview} />
          ) : null}

          <FeatureTabs<FiscalTab>
            activeClassName="!bg-accent !text-accent-foreground"
            ariaLabel="Seções do módulo fiscal"
            className="w-full"
            onChange={setTab}
            optionClassName="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-black text-muted transition-all hover:text-app-text"
            options={tabOptions}
            value={tab}
            variant="panel"
          />

          {tab === "notas" ? (
            <div className="grid gap-4">
              <FeatureKpiStrip ariaLabel="Resumo fiscal">
                <FeatureKpiCard
                  active={statusFilter === "issued"}
                  icon={FileText}
                  label="Emitidas"
                  onClick={() => toggleStatusFilter("issued")}
                  tone="green"
                  value={overview.summary.issued}
                />
                <FeatureKpiCard
                  active={statusFilter === "pending"}
                  icon={Clock}
                  label="Pendentes"
                  onClick={() => toggleStatusFilter("pending")}
                  tone="blue"
                  value={overview.summary.pending}
                />
                <FeatureKpiCard
                  active={statusFilter === "cancelled"}
                  icon={XCircle}
                  label="Canceladas"
                  onClick={() => toggleStatusFilter("cancelled")}
                  tone="pink"
                  value={overview.summary.cancelled}
                />
                <FeatureKpiCard
                  active={statusFilter === "failed"}
                  icon={ShieldAlert}
                  label="Falhas"
                  onClick={() => toggleStatusFilter("failed")}
                  tone="violet"
                  value={overview.summary.failed}
                />
              </FeatureKpiStrip>
              <FiscalDocumentList
                api={fiscalApi}
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
              {correction ? (
                <FiscalCorrectionPanel
                  document={correction.document}
                  draft={correction.draft}
                  onDismiss={() => setCorrection(null)}
                />
              ) : null}
              <FiscalIssueComposer
                api={fiscalApi}
                disabled={emissionDisabled}
                initialDraft={correction?.draft ?? null}
                onError={reportError}
                onIssued={handleIssued}
              />
            </div>
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
          icon={ShieldAlert}
          title="Operação fiscal indisponível"
        />
      ) : (
        <FeatureLoadingState>Carregando operação fiscal</FeatureLoadingState>
      )}
    </FeaturePageShell>
  );
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Não foi possível carregar o módulo fiscal.",
  );
}
