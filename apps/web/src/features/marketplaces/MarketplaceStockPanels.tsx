import {
  Ban,
  CheckCircle2,
  ClipboardList,
  ListChecks,
  RefreshCcw,
  Send,
  Trash2,
} from "lucide-react";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { getMarketplaceBlockerCopy, providerLabels } from "./marketplaceLabels";
import type {
  MarketplaceProvider,
  MarketplaceStockPlan,
  MarketplaceStockPlanItem,
  MarketplaceStockSyncRunResponse,
} from "./types";

export function MarketplaceStockPanel({
  lastRun,
  plan,
  provider,
}: {
  lastRun: MarketplaceStockSyncRunResponse | null;
  plan: MarketplaceStockPlan | null;
  provider: MarketplaceProvider | null;
}) {
  const blockedItems = plan?.items.filter(
    (item) => item.decision === "blocked",
  );
  const description = lastRun
    ? `${providerLabels[lastRun.provider]} · último lote desta sessão`
    : provider
      ? `Prévia do ${providerLabels[provider]} antes de enfileirar o lote.`
      : "Selecione um provedor antes de enfileirar o lote.";

  return (
    <FeatureSection description={description} title="Prévia e envios">
      {plan ? (
        <div className="marketplace-stock-panel">
          <FeatureKpiStrip ariaLabel="Contagens da prévia e do lote">
            <FeatureKpiCard
              icon={ListChecks}
              label="Total"
              tone="blue"
              value={plan.total}
            />
            <FeatureKpiCard
              icon={Send}
              label="Publicar"
              tone="green"
              value={plan.publish}
            />
            <FeatureKpiCard
              icon={RefreshCcw}
              label="Atualizar"
              tone="violet"
              value={plan.update}
            />
            <FeatureKpiCard
              icon={Trash2}
              label="Remover"
              tone="pink"
              value={plan.unpublish}
            />
            <FeatureKpiCard
              icon={CheckCircle2}
              label="Sem ação"
              tone="blue"
              value={plan.noOp}
            />
            <FeatureKpiCard
              icon={Ban}
              label="Bloqueados"
              tone="pink"
              value={plan.blocked}
            />
            {lastRun ? (
              <FeatureKpiCard
                icon={ClipboardList}
                label="Jobs criados"
                tone="green"
                value={lastRun.createdJobs.length}
              />
            ) : null}
          </FeatureKpiStrip>
          <BlockedListingList items={blockedItems ?? []} />
        </div>
      ) : (
        <p className="marketplace-stock-panel__empty">
          A prévia ainda não foi gerada. Use “Gerar prévia” na conta que deseja
          revisar.
        </p>
      )}
    </FeatureSection>
  );
}

function BlockedListingList({ items }: { items: MarketplaceStockPlanItem[] }) {
  return (
    <section className="marketplace-blocked">
      <h4>Veículos bloqueados</h4>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item.listing.listingId}>
              <strong>{vehicleLabel(item)}</strong>
              {item.blockers.map((blocker) => {
                const copy = getMarketplaceBlockerCopy(blocker);
                return (
                  <span key={`${item.listing.listingId}-${blocker.code}`}>
                    {copy.message}. Próximo passo: {copy.action} Canal:{" "}
                    {providerLabels[item.provider]}.
                  </span>
                );
              })}
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum veículo bloqueado nesta prévia.</p>
      )}
    </section>
  );
}

function vehicleLabel(item: MarketplaceStockPlanItem) {
  return item.listing.stockLabel ?? item.listing.title;
}
