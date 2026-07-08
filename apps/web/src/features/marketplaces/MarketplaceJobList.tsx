import { RotateCcw } from "lucide-react";
import { jobLabels, providerLabels } from "./marketplaceLabels";
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
        <h3>Syncs recentes</h3>
        <p>Jobs de estoque criados para a loja atual.</p>
      </header>
      <div className="marketplace-job-list">
        {overview.jobs.length ? (
          overview.jobs.map((job) => (
            <article className="marketplace-job" key={job.id}>
              <strong>{providerLabels[job.provider]}</strong>
              <span>
                {jobLabels[job.jobType] ?? job.jobType} · {job.status}
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
          <p>Nenhum sync solicitado.</p>
        )}
      </div>
    </section>
  );
}

function JobFailureMessage({ job }: { job: MarketplaceJob }) {
  return (
    <p>
      Falhou: {job.errorMessage}. Corrigir: tente novamente ou gere uma nova
      previa. Provedor: {providerLabels[job.provider]}. Veiculo:{" "}
      {job.metadata.listingId ?? "lote de estoque"}. ID do erro:{" "}
      {job.metadata.providerResult?.providerRequestId ?? "Nao informado"}.
    </p>
  );
}

function jobVehicleLabel(job: MarketplaceJob) {
  return job.metadata.listingId
    ? `Veiculo: ${job.metadata.listingId}`
    : "Veiculo: lote de estoque";
}
