import { RotateCcw } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { FeatureRowAction } from "../../components/ui/FeatureTable";
import {
  getMarketplaceJobStatusLabel,
  getMarketplaceJobTypeLabel,
  providerLabels,
} from "./marketplaceLabels";
import type {
  MarketplaceJob,
  MarketplaceJobStatus,
  MarketplaceOverview,
} from "./types";

export function MarketplaceJobList({
  onRetry,
  overview,
}: {
  onRetry: (job: MarketplaceJob) => Promise<void>;
  overview: MarketplaceOverview;
}) {
  return (
    <FeatureSection
      description="Resultados dos últimos lotes solicitados para a loja atual."
      title="Atividade recente"
    >
      <div className="marketplace-job-list">
        {overview.jobs.length ? (
          overview.jobs.map((job) => (
            <article
              className="marketplace-job"
              data-status={job.status}
              key={job.id}
            >
              <div className="marketplace-job__provider">
                <strong>{providerLabels[job.provider]}</strong>
                <FeatureStatusBadge size="dense" tone={jobTone(job.status)}>
                  {getMarketplaceJobStatusLabel(job.status)}
                </FeatureStatusBadge>
              </div>
              <div className="marketplace-job__description">
                <span>{getMarketplaceJobTypeLabel(job.jobType)}</span>
                <small>{jobVehicleLabel(job)}</small>
              </div>
              {job.errorMessage ? <JobFailureMessage job={job} /> : null}
              {job.status === "failed" ? (
                <FeatureRowAction
                  ariaLabel={`Tentar novamente no ${providerLabels[job.provider]}`}
                  icon={RotateCcw}
                  onClick={() => void onRetry(job)}
                  tooltip="Tentar novamente"
                />
              ) : null}
            </article>
          ))
        ) : (
          <p>Nenhuma sincronização de estoque foi solicitada.</p>
        )}
      </div>
    </FeatureSection>
  );
}

function JobFailureMessage({ job }: { job: MarketplaceJob }) {
  return (
    <p className="marketplace-job__message">
      {job.status === "cancelled"
        ? "O envio foi cancelado antes da confirmação do canal. Gere uma nova prévia para reenviar."
        : `O canal não confirmou esta operação. Revise os bloqueios antes de tentar novamente no ${providerLabels[job.provider]}.`}
    </p>
  );
}

function jobVehicleLabel(job: MarketplaceJob) {
  return job.metadata.listingId
    ? "Escopo: anúncio individual"
    : "Escopo: lote de estoque";
}

function jobTone(status: MarketplaceJobStatus) {
  switch (status) {
    case "cancelled":
      return "neutral" as const;
    case "failed":
      return "danger" as const;
    case "queued":
    case "running":
      return "blue" as const;
    case "succeeded":
      return "success" as const;
  }
}
