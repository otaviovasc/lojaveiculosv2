import {
  Clock3,
  ImagePlus,
  ListChecks,
  Send,
  Settings,
  Wrench,
  EyeOff,
} from "lucide-react";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { getMarketplaceBlockerCopy, providerLabels } from "./marketplaceLabels";
import type {
  MarketplaceBlockerLayer,
  MarketplaceProvider,
  MarketplaceStockAccountingStatus,
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
  const description = lastRun
    ? `${providerLabels[lastRun.provider]} · último lote desta sessão`
    : provider
      ? `Prévia do ${providerLabels[provider]} antes de enfileirar o lote.`
      : "Selecione um provedor antes de enfileirar o lote.";

  return (
    <FeatureSection description={description} title="Prévia e envios">
      {plan ? (
        <div className="marketplace-stock-panel">
          <FeatureKpiStrip ariaLabel="Contabilidade completa do estoque">
            <FeatureKpiCard
              icon={ListChecks}
              label="Estoque encontrado"
              tone="blue"
              value={plan.accounting.found}
            />
            <FeatureKpiCard
              icon={Send}
              label="Prontos para publicar"
              tone="green"
              value={plan.accounting.ready}
            />
            <FeatureKpiCard
              icon={Wrench}
              label="Precisam de correção"
              tone="pink"
              value={plan.accounting.needsCorrection}
            />
            <FeatureKpiCard
              icon={EyeOff}
              label="Fora da publicação"
              tone="violet"
              value={plan.accounting.excluded}
            />
            <FeatureKpiCard
              icon={Clock3}
              label="Em processamento"
              tone="blue"
              value={plan.accounting.processing}
            />
            {lastRun ? (
              <FeatureKpiCard
                icon={Send}
                label="Jobs criados"
                tone="green"
                value={lastRun.createdJobs.length}
              />
            ) : null}
          </FeatureKpiStrip>
          <MarketplaceStockItemList items={plan.items} />
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

function MarketplaceStockItemList({
  items,
}: {
  items: MarketplaceStockPlanItem[];
}) {
  return (
    <section className="marketplace-stock-items">
      <h4>Situação de cada veículo</h4>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <MarketplaceStockItem key={item.listing.listingId} item={item} />
          ))}
        </ul>
      ) : (
        <p>Nenhum veículo foi encontrado nesta prévia.</p>
      )}
    </section>
  );
}

function MarketplaceStockItem({ item }: { item: MarketplaceStockPlanItem }) {
  const action = itemAction(item);
  const status = itemStatus(item);

  return (
    <li data-stock-status={item.accountingStatus}>
      <div className="marketplace-stock-item__header">
        <strong>{vehicleLabel(item)}</strong>
        <FeatureStatusBadge size="dense" tone={status.tone}>
          {status.label}
        </FeatureStatusBadge>
      </div>
      <p>{item.reason}</p>
      {item.blockers.length ? (
        <ul className="marketplace-stock-item__blockers">
          {item.blockers.map((blocker, index) => {
            const copy = getMarketplaceBlockerCopy(blocker);
            return (
              <li
                key={`${item.listing.listingId}-${blocker.code}-${blocker.field ?? "none"}-${index}`}
              >
                <span className="marketplace-stock-item__layer">
                  {layerLabel(blocker.layer, item.provider)}
                </span>
                <span>
                  <strong>{copy.message}</strong> Próximo passo: {copy.action}
                </span>
              </li>
            );
          })}
        </ul>
      ) : item.userAction ? (
        <p className="marketplace-stock-item__next-step">
          Próximo passo: {item.userAction}
        </p>
      ) : null}
      {action ? (
        <FeatureActionButton
          icon={action.icon}
          label={`${action.label}: ${vehicleLabel(item)}`}
          onClick={() => {
            window.location.hash = action.hash;
          }}
        >
          {action.label}
        </FeatureActionButton>
      ) : null}
    </li>
  );
}

function itemAction(item: MarketplaceStockPlanItem) {
  const inventoryHash = `#/inventory?listing=${encodeURIComponent(item.listing.listingId)}`;
  if (
    item.blockers.some(
      (blocker) =>
        blocker.code === "MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS" ||
        blocker.code === "MARKETPLACE_LISTING_PHOTOS_INVALID",
    )
  ) {
    return { hash: inventoryHash, icon: ImagePlus, label: "Adicionar fotos" };
  }
  if (
    item.accountingStatus === "excluded" &&
    item.origin === "stock" &&
    item.userAction
  ) {
    return { hash: inventoryHash, icon: Send, label: "Publicar no site" };
  }
  if (
    item.blockers.some(
      (blocker) => blocker.layer === "catalog" || blocker.layer === "listing",
    )
  ) {
    return { hash: inventoryHash, icon: Wrench, label: "Corrigir veículo" };
  }
  if (item.blockers.some((blocker) => blocker.layer === "store")) {
    return { hash: "#/settings", icon: Settings, label: "Abrir configurações" };
  }
  return null;
}

function itemStatus(item: MarketplaceStockPlanItem) {
  if (item.origin === "provider_only") {
    return { label: "Limpeza do canal", tone: "warning" as const };
  }
  const statuses: Record<
    MarketplaceStockAccountingStatus,
    { label: string; tone: "blue" | "neutral" | "success" | "warning" }
  > = {
    excluded: { label: "Fora da publicação", tone: "neutral" },
    needs_correction: { label: "Precisa de correção", tone: "warning" },
    processing: { label: "Em processamento", tone: "blue" },
    ready: { label: "Pronto para publicar", tone: "success" },
  };
  return statuses[item.accountingStatus];
}

function layerLabel(
  layer: MarketplaceBlockerLayer,
  provider: MarketplaceProvider,
) {
  const labels: Record<MarketplaceBlockerLayer, string> = {
    catalog: "Cadastro",
    connection: "Conexão",
    listing: "Anúncio",
    provider: providerLabels[provider],
    store: "Loja",
  };
  return labels[layer];
}

function vehicleLabel(item: MarketplaceStockPlanItem) {
  return item.listing.stockLabel ?? item.listing.title;
}
