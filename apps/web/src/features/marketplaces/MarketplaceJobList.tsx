import { RotateCcw } from "lucide-react";
import {
  getMarketplaceJobStatusLabel,
  getMarketplaceJobTypeLabel,
  providerLabels,
} from "./marketplaceLabels";
import type { MarketplaceJob, MarketplaceOverview } from "./types";

export function MarketplaceJobList({
  onRetry,
  overview,
}: {
  onRetry: (job: MarketplaceJob) => Promise<void>;
  overview: MarketplaceOverview;
}) {
  return (
    <section className="marketplace-panel">
      <header>
        <h3>Sincronizações recentes</h3>
        <p>Publicações de estoque solicitadas para a loja atual.</p>
      </header>
      <div className="marketplace-job-list">
        {overview.jobs.length ? (
          overview.jobs.map((job) => (
            <article className="marketplace-job" key={job.id}>
              <strong>{providerLabels[job.provider]}</strong>
              <span>
                {getMarketplaceJobTypeLabel(job.jobType)} ·{" "}
                {getMarketplaceJobStatusLabel(job.status)}
              </span>
              <small>{jobVehicleLabel(job)}</small>
              {job.errorMessage ? <JobFailureMessage job={job} /> : null}
              <button
                disabled={job.status !== "failed"}
                onClick={() => void onRetry(job)}
                type="button"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Tentar novamente
              </button>
            </article>
          ))
        ) : (
          <p>Nenhuma sincronização de estoque foi solicitada.</p>
        )}
      </div>
    </section>
  );
}

function JobFailureMessage({ job }: { job: MarketplaceJob }) {
  return (
    <p>
      A sincronização não foi concluída. Revise os bloqueios, gere uma nova
      prévia ou tente novamente no {providerLabels[job.provider]}.
    </p>
  );
}

function jobVehicleLabel(job: MarketplaceJob) {
  return job.metadata.listingId
    ? "Escopo: anúncio individual"
    : "Escopo: lote de estoque";
}
