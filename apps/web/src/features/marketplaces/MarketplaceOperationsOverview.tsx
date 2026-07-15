import { Activity, BadgeCheck, CarFront, TriangleAlert } from "lucide-react";
import { StatCard } from "../../components/ui/stat-card";
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
  const ConnectionSummaryIcon = channelsRequiringAttention
    ? TriangleAlert
    : BadgeCheck;
  const connectionSummary =
    channelsRequiringAttention === 0
      ? "Todos os canais prontos"
      : connectedProviders === 0
        ? `${channelsRequiringAttention} canais pedem atenção`
        : `${connectedProviders} de ${overview.providers.length} canais prontos`;

  return (
    <section className="marketplace-operations marketplace-panel">
      <header className="marketplace-section-heading">
        <div>
          <span className="marketplace-section-heading__eyebrow">
            Operação centralizada
          </span>
          <h2>Distribuição do estoque</h2>
          <p>
            Conecte os canais uma vez e acompanhe a prontidão do catálogo sem
            selecionar veículos manualmente.
          </p>
        </div>
        <div
          className="marketplace-operations__connection-summary"
          data-ready={channelsRequiringAttention === 0}
        >
          <ConnectionSummaryIcon aria-hidden="true" className="size-4" />
          <span>{connectionSummary}</span>
        </div>
      </header>

      <div
        aria-label="Resumo operacional dos marketplaces"
        className="marketplace-operations__metrics"
        role="region"
      >
        <StatCard
          icon={BadgeCheck}
          label="Canais prontos"
          theme="success"
          value={connectedProviders}
          variant="cell"
        />
        <StatCard
          icon={TriangleAlert}
          label="Pedem atenção"
          theme="amber"
          value={channelsRequiringAttention}
          variant="cell"
        />
        <StatCard
          icon={Activity}
          label="Na fila agora"
          theme="blue"
          value={pendingJobs}
          variant="cell"
        />
        <StatCard
          icon={TriangleAlert}
          label="Falhas recentes"
          theme={failedJobs ? "amber" : "default"}
          value={failedJobs}
          variant="cell"
        />
      </div>

      <div className="marketplace-operations__vehicle-detail">
        <span className="marketplace-operations__vehicle-icon">
          <CarFront aria-hidden="true" className="size-5" />
        </span>
        <div>
          <strong>Visão por veículo</strong>
          <p>
            O detalhe do veículo concentra os portais daquele anúncio. Aqui,
            acompanhe conexões e lotes do estoque inteiro.
            {evaluatedItems > 0
              ? ` A última sincronização avaliou ${evaluatedItems} itens de canal.`
              : " Gere uma prévia em um canal para medir a cobertura atual."}
          </p>
        </div>
      </div>
    </section>
  );
}
