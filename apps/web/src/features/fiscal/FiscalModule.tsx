import { FileText, RefreshCcw, Send, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createFiscalApi, type FiscalApi } from "./apiClient";
import { createFiscalApiOptions } from "./runtimeApi";
import type { FiscalOverview } from "./types";

export function FiscalModule({ api }: { api?: FiscalApi }) {
  const fiscalApi = useMemo(() => api ?? createRuntimeFiscalApi(), [api]);
  const [overview, setOverview] = useState<FiscalOverview | null>(null);
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });
  const [reference, setReference] = useState("");

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

  const issue = async () => {
    setStatus({ kind: "saving" });
    try {
      await fiscalApi.issueDocument({
        documentType: "nfe_vehicle_sale",
        externalReference: reference || "manual-fiscal-test",
      });
      setReference("");
      await refresh();
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  return (
    <main className="feature-shell">
      <section className="feature-hero">
        <div>
          <span className="feature-badge">
            <FileText aria-hidden="true" className="size-4" />
            SPEDY / NF-e
          </span>
          <h2>Operacao fiscal</h2>
          <p>Emissao, cancelamento e reconciliacao fiscal com auditoria.</p>
        </div>
        <button
          aria-label="Atualizar fiscal"
          className="feature-icon-action"
          onClick={() => void refresh()}
          title="Atualizar fiscal"
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-5" />
        </button>
      </section>

      {status.kind === "error" ? (
        <p className="feature-alert">{status.message}</p>
      ) : null}
      {overview ? (
        <>
          <ProviderPanel overview={overview} />
          <section className="feature-panel">
            <h3>Emitir documento</h3>
            <div className="feature-form-row">
              <input
                aria-label="Referencia externa"
                onChange={(event) => setReference(event.target.value)}
                placeholder="Venda, lead ou lancamento"
                value={reference}
              />
              <button
                disabled={status.kind === "saving"}
                onClick={() => void issue()}
                type="button"
              >
                <Send aria-hidden="true" className="size-4" />
                Emitir
              </button>
            </div>
          </section>
          <section className="feature-grid four">
            <Metric label="Emitidas" value={overview.summary.issued} />
            <Metric label="Pendentes" value={overview.summary.pending} />
            <Metric label="Canceladas" value={overview.summary.cancelled} />
            <Metric label="Falhas" value={overview.summary.failed} />
          </section>
          <section className="feature-panel">
            <h3>Documentos recentes</h3>
            <div className="feature-list">
              {overview.documents.length ? (
                overview.documents.map((document) => (
                  <article key={document.id}>
                    <strong>{document.documentType}</strong>
                    <span>{document.status}</span>
                    <small>
                      {document.providerDocumentId ?? "sem id provider"}
                    </small>
                  </article>
                ))
              ) : (
                <p>Nenhum documento fiscal emitido ainda.</p>
              )}
            </div>
          </section>
        </>
      ) : (
        <p className="feature-empty">Carregando fiscal</p>
      )}
    </main>
  );
}

function ProviderPanel({ overview }: { overview: FiscalOverview }) {
  return (
    <section className="feature-panel feature-provider">
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
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="feature-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
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
  return error instanceof Error ? error.message : String(error);
}
