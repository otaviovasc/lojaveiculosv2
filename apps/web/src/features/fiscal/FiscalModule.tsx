import {
  FileQuestion,
  FileText,
  RefreshCcw,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
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
import { createFiscalApi, type FiscalApi } from "./apiClient";
import { FiscalIssueReviewDialog } from "./FiscalIssueReviewDialog";
import { FiscalProviderPanel } from "./FiscalProviderPanel";
import { createFiscalApiOptions } from "./runtimeApi";
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
  const [reference, setReference] = useState("");
  const [pendingReference, setPendingReference] = useState<string | null>(null);

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

  const issue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!overview?.provider.configured || !reference.trim()) return;
    setPendingReference(reference.trim());
  };

  const confirmIssue = async () => {
    if (!pendingReference) return;
    setStatus({ kind: "saving" });
    try {
      await fiscalApi.issueDocument({
        documentType: "nfe_vehicle_sale",
        externalReference: pendingReference,
      });
      setReference("");
      setPendingReference(null);
      await refresh();
    } catch (error) {
      setPendingReference(null);
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

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
            <FeatureSection
              className="feature-panel"
              description="Informe a venda ou o lançamento que dará origem à nota."
              title="Emitir NF-e de venda de veículo"
            >
              {overview.provider.configured ? (
                <form
                  className="feature-form-row"
                  onSubmit={(event) => void issue(event)}
                >
                  <FeatureField
                    hint="Use a referência da operação registrada no sistema."
                    label="Operação de origem"
                  >
                    <FeatureInput
                      aria-label="Operação de origem"
                      disabled={status.kind === "saving"}
                      maxLength={191}
                      name="externalReference"
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="Ex.: venda 1042"
                      required
                      value={reference}
                    />
                  </FeatureField>
                  <FeatureActionButton
                    disabled={!reference.trim()}
                    icon={Send}
                    isBusy={status.kind === "saving"}
                    label={
                      status.kind === "saving" ? "Emitindo NF-e" : "Emitir NF-e"
                    }
                    type="submit"
                    variant="primary"
                  />
                </form>
              ) : (
                <FeatureAlert title="Emissão indisponível" tone="warning">
                  <p>
                    A integração fiscal ainda precisa ser concluída por um
                    administrador. Nenhuma nota será emitida até a configuração
                    estar pronta.
                  </p>
                </FeatureAlert>
              )}
            </FeatureSection>
          </section>
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
      <FiscalIssueReviewDialog
        isSaving={status.kind === "saving"}
        onClose={() => setPendingReference(null)}
        onConfirm={() => void confirmIssue()}
        reference={pendingReference}
      />
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

function createRuntimeFiscalApi(): FiscalApi {
  return {
    getOverview: async () =>
      createFiscalApi(await createFiscalApiOptions()).getOverview(),
    issueDocument: async (input) =>
      createFiscalApi(await createFiscalApiOptions()).issueDocument(input),
  };
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Não foi possível carregar o módulo fiscal.",
  );
}
