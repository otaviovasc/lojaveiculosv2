import { FileText, RefreshCcw, ShieldAlert } from "lucide-react";
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
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { FiscalApi } from "./apiClient";
import { FiscalCatalogPanels } from "./FiscalCatalogPanels";
import { FiscalDocumentActions } from "./FiscalDocumentActions";
import { FiscalIssueComposer } from "./FiscalIssueComposer";
import { createRuntimeFiscalApi } from "./runtimeApi";
import type { FiscalOverview } from "./types";

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
    <FeaturePageShell className="feature-shell" variant="content">
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            label="Atualizar"
            onClick={() => void refresh()}
            title="Atualizar fiscal"
          />
        }
        description="Emissao, cancelamento e reconciliacao fiscal com auditoria."
        eyebrow="SPEDY / NF-e"
        title="Operacao fiscal"
      />

      {status.kind === "error" ? (
        <FeatureAlert>{status.message}</FeatureAlert>
      ) : null}
      {overview ? (
        <>
          <ProviderPanel overview={overview} />
          <FiscalIssueComposer
            api={fiscalApi}
            disabled={status.kind === "saving"}
            onError={(message) => setStatus({ kind: "error", message })}
            onIssued={refresh}
          />
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
            <div className="feature-list">
              {overview.documents.length ? (
                overview.documents.map((document) => (
                  <article key={document.id}>
                    <strong>{document.documentType}</strong>
                    <span>{document.status}</span>
                    <small>
                      {document.providerDocumentId ?? "sem id provider"}
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
                ))
              ) : (
                <p>Nenhum documento fiscal emitido ainda.</p>
              )}
            </div>
          </FeatureSection>
        </>
      ) : (
        <FeatureLoadingState>Carregando fiscal</FeatureLoadingState>
      )}
    </FeaturePageShell>
  );
}

function ProviderPanel({ overview }: { overview: FiscalOverview }) {
  return (
    <FeatureSection className="feature-panel feature-provider">
      <ShieldAlert aria-hidden="true" className="size-5" />
      <div>
        <h3>
          {overview.provider.configured
            ? "SPEDY configurado"
            : "SPEDY pendente"}
        </h3>
        <p>
          {overview.provider.configured
            ? "Credenciais e webhook prontos para operacao."
            : `Faltam: ${overview.provider.missingConfiguration.join(", ")}`}
        </p>
      </div>
    </FeatureSection>
  );
}

type LoadStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saving" };

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Nao foi possivel carregar o modulo fiscal.",
  );
}
