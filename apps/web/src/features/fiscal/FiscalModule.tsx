import { FileQuestion, FileText, RefreshCcw, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { FiscalApi } from "./apiClient";
import { FiscalCatalogPanels } from "./FiscalCatalogPanels";
import { FiscalDocumentActions } from "./FiscalDocumentActions";
import { FiscalIssueComposer } from "./FiscalIssueComposer";
import { FiscalProviderPanel } from "./FiscalProviderPanel";
import { createRuntimeFiscalApi } from "./runtimeApi";
import {
  formatFiscalDate,
  getFiscalDocumentStatusLabel,
  getFiscalDocumentTypeLabel,
} from "./fiscalLabels";
import type { FiscalDocument, FiscalOverview } from "./types";
import "./fiscal.css";

export function FiscalModule({ api }: { api?: FiscalApi }) {
  const fiscalApi = useMemo(() => api ?? createRuntimeFiscalApi(), [api]);
  const [overview, setOverview] = useState<FiscalOverview | null>(null);
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      setOverview(await fiscalApi.getOverview());
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <FeaturePageShell mainClassName="feature-shell">
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            label="Atualizar"
            onClick={() => void refresh()}
            title="Atualizar fiscal"
          />
        }
        description="Emita e acompanhe notas fiscais vinculadas às operações reais da loja."
        eyebrow="Notas fiscais · Spedy"
        title="Operação fiscal"
      />

      {status.kind === "error" ? (
        <FeatureAlert>{status.message}</FeatureAlert>
      ) : null}
      {overview ? (
        <>
          <section className="fiscal-setup-grid">
            <FiscalProviderPanel overview={overview} />
            <FiscalIssueComposer
              api={fiscalApi}
              disabled={
                status.kind === "saving" || !overview.provider.configured
              }
              onError={(message) => setStatus({ kind: "error", message })}
              onIssued={refresh}
            />
          </section>
          <FiscalCatalogPanels
            api={fiscalApi}
            onError={(message) => setStatus({ kind: "error", message })}
          />
          <FeatureKpiStrip ariaLabel="Resumo fiscal">
            <FeatureKpiCard
              icon={FileText}
              label="Emitidas"
              tone="green"
              value={overview.summary.issued}
            />
            <FeatureKpiCard
              icon={FileText}
              label="Pendentes"
              tone="blue"
              value={overview.summary.pending}
            />
            <FeatureKpiCard
              icon={FileText}
              label="Canceladas"
              tone="pink"
              value={overview.summary.cancelled}
            />
            <FeatureKpiCard
              icon={ShieldAlert}
              label="Falhas"
              tone="violet"
              value={overview.summary.failed}
            />
          </FeatureKpiStrip>
          <FeatureSection className="feature-panel" title="Documentos recentes">
            {overview.documents.length ? (
              <div className="feature-list">
                {overview.documents.map((document) => (
                  <article key={document.id}>
                    <strong>
                      {getFiscalDocumentTypeLabel(document.documentType)}
                    </strong>
                    <FeatureStatusBadge tone={statusTone(document)}>
                      {getFiscalDocumentStatusLabel(document.status)}
                    </FeatureStatusBadge>
                    <small>
                      Registrado em {formatFiscalDate(document.createdAt)}
                    </small>
                    <FiscalDocumentActions
                      api={fiscalApi}
                      document={document}
                      onError={(message) =>
                        setStatus({ kind: "error", message })
                      }
                      onRefresh={refresh}
                    />
                  </article>
                ))}
              </div>
            ) : (
              <FeatureEmptyState
                body="As notas emitidas pela loja aparecerão aqui depois da primeira operação fiscal."
                icon={FileQuestion}
                title="Nenhum documento fiscal"
              />
            )}
          </FeatureSection>
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

function statusTone(document: FiscalDocument) {
  if (document.status === "issued") return "success" as const;
  if (document.status === "failed") return "danger" as const;
  if (document.status === "cancelled") return "neutral" as const;
  return "warning" as const;
}

type LoadStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saving" };

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Não foi possível carregar o módulo fiscal.",
  );
}
