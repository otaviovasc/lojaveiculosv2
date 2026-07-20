import {
  Activity,
  BadgeCheck,
  CarFront,
  CircleX,
  TriangleAlert,
} from "lucide-react";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
import { resolveMarketplaceConnectionPresentation } from "./marketplaceConnectionPresentation";
import type { MarketplaceOverview } from "./types";

export function MarketplaceOperationsOverview({
  overview,
}: {
  overview: MarketplaceOverview;
}) {
  const connectedProviders = overview.providers.filter(
    (provider) =>
      resolveMarketplaceConnectionPresentation(
        overview.providerStates.find((state) => state.provider === provider),
        overview.accounts.find((account) => account.provider === provider),
      ).canSync,
  ).length;
  const channelsRequiringAttention =
    overview.providers.length - connectedProviders;
  const pendingJobs = overview.jobs.filter(
    (job) => job.status === "queued" || job.status === "running",
  ).length;
  const failedJobs = overview.jobs.filter(
    (job) => job.status === "failed",
  ).length;
  const evaluatedItems = overview.providerStates.reduce(
    (total, state) => total + (state.lastSyncSummary?.total ?? 0),
    0,
  );

  return (
    <section
      aria-label="Operação dos marketplaces"
      className="marketplace-overview"
    >
      <FeatureKpiStrip ariaLabel="Resumo operacional dos marketplaces">
        <FeatureKpiCard
          animationIndex={0}
          icon={BadgeCheck}
          label="Canais prontos"
          tone="green"
          value={connectedProviders}
        />
        <FeatureKpiCard
          animationIndex={1}
          icon={TriangleAlert}
          label="Pedem atenção"
          tone="pink"
          value={channelsRequiringAttention}
        />
        <FeatureKpiCard
          animationIndex={2}
          icon={Activity}
          label="Na fila agora"
          tone="blue"
          value={pendingJobs}
        />
        <FeatureKpiCard
          animationIndex={3}
          icon={CircleX}
          label="Falhas recentes"
          tone="violet"
          value={failedJobs}
        />
      </FeatureKpiStrip>
      <aside className="marketplace-scope-note">
        <span className="marketplace-scope-note__icon">
          <CarFront aria-hidden="true" className="size-5" />
        </span>
        <div>
          <strong>Visão por veículo</strong>
          <p>
            Ajustes de um anúncio ficam no detalhe do veículo; esta central
            cuida dos lotes da loja.
            {evaluatedItems > 0
              ? ` Última revisão: ${evaluatedItems} itens de canal.`
              : " Gere uma prévia para medir a cobertura."}
          </p>
        </div>
      </aside>
    </section>
  );
}
