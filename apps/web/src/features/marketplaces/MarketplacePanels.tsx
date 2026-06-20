import { BadgeCheck, Ban, UploadCloud } from "lucide-react";
import type {
  MarketplaceAccount,
  MarketplaceOverview,
  MarketplaceProvider,
  MarketplaceSyncJobType,
} from "./types";

export const providerLabels: Record<MarketplaceProvider, string> = {
  mercado_livre: "Mercado Livre",
  olx: "OLX",
};

export const jobLabels: Record<MarketplaceSyncJobType, string> = {
  inventory_sync: "Sincronizar estoque",
  lead_sync: "Importar leads",
  listing_publish: "Publicar anuncios",
  listing_unpublish: "Remover anuncios",
  listing_update: "Atualizar anuncios",
};

export function MarketplaceProviderCard({
  account,
  isSaving,
  listingId,
  oauthCode,
  onCompleteConnection,
  onConnect,
  onCreateJob,
  onListingIdChange,
  onOauthCodeChange,
  onStatusChange,
  provider,
}: {
  account: MarketplaceAccount | undefined;
  isSaving: boolean;
  listingId: string;
  oauthCode: string;
  onCompleteConnection: (provider: MarketplaceProvider) => Promise<void>;
  onConnect: (provider: MarketplaceProvider) => Promise<void>;
  onCreateJob: (
    provider: MarketplaceProvider,
    jobType: MarketplaceSyncJobType,
  ) => Promise<void>;
  onListingIdChange: (provider: MarketplaceProvider, value: string) => void;
  onOauthCodeChange: (provider: MarketplaceProvider, value: string) => void;
  onStatusChange: (
    provider: MarketplaceProvider,
    status: "active" | "inactive",
  ) => Promise<void>;
  provider: MarketplaceProvider;
}) {
  return (
    <article className="marketplace-card">
      <div>
        <span
          className={
            account?.status === "active" ? "is-enabled" : "is-disabled"
          }
        >
          {account?.status === "active" ? (
            <BadgeCheck aria-hidden="true" className="size-4" />
          ) : (
            <Ban aria-hidden="true" className="size-4" />
          )}
          {account?.status ?? "nao conectado"}
        </span>
        <h3>{providerLabels[provider]}</h3>
        <p>Conta de publicacao e importacao de leads.</p>
      </div>
      <div className="marketplace-actions">
        <button
          disabled={isSaving}
          onClick={() => void onConnect(provider)}
          type="button"
        >
          Conectar OAuth
        </button>
        <button
          disabled={isSaving}
          onClick={() => void onStatusChange(provider, "active")}
          type="button"
        >
          Ativar
        </button>
        <button
          disabled={isSaving}
          onClick={() => void onStatusChange(provider, "inactive")}
          type="button"
        >
          Pausar
        </button>
      </div>
      <div className="marketplace-form-grid">
        <input
          aria-label={`Codigo OAuth ${providerLabels[provider]}`}
          onChange={(event) => onOauthCodeChange(provider, event.target.value)}
          placeholder="Codigo OAuth do portal"
          value={oauthCode}
        />
        <button
          disabled={isSaving || !oauthCode.trim()}
          onClick={() => void onCompleteConnection(provider)}
          type="button"
        >
          Finalizar conexao
        </button>
      </div>
      <input
        aria-label={`Listing id ${providerLabels[provider]}`}
        className="marketplace-listing-input"
        onChange={(event) => onListingIdChange(provider, event.target.value)}
        placeholder="ID do veiculo/listing para publicar"
        value={listingId}
      />
      <div className="marketplace-job-actions">
        {(["inventory_sync", "lead_sync", "listing_update"] as const).map(
          (jobType) => (
            <button
              disabled={
                isSaving || account?.status !== "active" || !listingId.trim()
              }
              key={jobType}
              onClick={() => void onCreateJob(provider, jobType)}
              type="button"
            >
              <UploadCloud aria-hidden="true" className="size-4" />
              {jobLabels[jobType]}
            </button>
          ),
        )}
      </div>
    </article>
  );
}

export function MarketplaceJobList({
  onRun,
  overview,
}: {
  onRun: (jobId: string) => Promise<void>;
  overview: MarketplaceOverview;
}) {
  return (
    <section className="marketplace-panel">
      <header>
        <h3>Syncs recentes</h3>
        <p>Jobs criados para a loja atual.</p>
      </header>
      <div className="marketplace-job-list">
        {overview.jobs.length ? (
          overview.jobs.map((job) => (
            <article className="marketplace-job" key={job.id}>
              <strong>{providerLabels[job.provider]}</strong>
              <span>
                {jobLabels[job.jobType]} · {job.status}
              </span>
              <button
                disabled={
                  job.status === "running" || job.status === "succeeded"
                }
                onClick={() => void onRun(job.id)}
                type="button"
              >
                Executar
              </button>
            </article>
          ))
        ) : (
          <p>Nenhum sync solicitado.</p>
        )}
      </div>
    </section>
  );
}
