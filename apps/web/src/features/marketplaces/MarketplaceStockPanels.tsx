import {
  Ban,
  CheckCircle2,
  ListChecks,
  RefreshCcw,
  Send,
  Trash2,
} from "lucide-react";
import { StatCard } from "../../components/ui/stat-card";
import { getMarketplaceBlockerCopy, providerLabels } from "./marketplaceLabels";
import type {
  MarketplaceProvider,
  MarketplaceStockPlan,
  MarketplaceStockPlanItem,
  MarketplaceStockSyncRunResponse,
} from "./types";

export function MarketplacePreviewPanel({
  plan,
  provider,
}: {
  plan: MarketplaceStockPlan | null;
  provider: MarketplaceProvider | null;
}) {
  const blockedItems = plan?.items.filter(
    (item) => item.decision === "blocked",
  );
  return (
    <section className="marketplace-panel">
      <header>
        <h3>Prévia do estoque</h3>
        <p>
          {provider ? providerLabels[provider] : "Selecione um provedor"} antes
          de enfileirar o lote.
        </p>
      </header>
      {plan ? (
        <>
          <div className="marketplace-counts" aria-label="Contagens da prévia">
            <StatCard
              icon={ListChecks}
              label="Total"
              theme="blue"
              value={plan.total}
              variant="cell"
            />
            <StatCard
              icon={Send}
              label="Publicar"
              theme="success"
              value={plan.publish}
              variant="cell"
            />
            <StatCard
              icon={RefreshCcw}
              label="Atualizar"
              theme="indigo"
              value={plan.update}
              variant="cell"
            />
            <StatCard
              icon={Trash2}
              label="Remover"
              theme="amber"
              value={plan.unpublish}
              variant="cell"
            />
            <StatCard
              icon={CheckCircle2}
              label="Sem ação"
              theme="default"
              value={plan.noOp}
              variant="cell"
            />
            <StatCard
              icon={Ban}
              label="Bloqueados"
              theme="amber"
              value={plan.blocked}
              variant="cell"
            />
          </div>
          <BlockedListingList items={blockedItems ?? []} />
        </>
      ) : (
        <p>
          A prévia ainda não foi gerada. Use “Prever estoque” na conta que
          deseja revisar.
        </p>
      )}
    </section>
  );
}

export function MarketplaceBatchProgress({
  lastRun,
}: {
  lastRun: MarketplaceStockSyncRunResponse | null;
}) {
  return (
    <section className="marketplace-panel">
      <header>
        <h3>Progresso do lote</h3>
        <p>
          {lastRun
            ? `${providerLabels[lastRun.provider]} · último lote desta sessão`
            : "Nenhum lote foi enviado nesta sessão."}
        </p>
      </header>
      {lastRun ? (
        <div className="marketplace-counts" aria-label="Progresso do lote">
          <StatCard
            icon={ListChecks}
            label="Jobs criados"
            theme="blue"
            value={lastRun.createdJobs.length}
            variant="cell"
          />
          <StatCard
            icon={Send}
            label="Publicar"
            theme="success"
            value={lastRun.plan.publish}
            variant="cell"
          />
          <StatCard
            icon={RefreshCcw}
            label="Atualizar"
            theme="indigo"
            value={lastRun.plan.update}
            variant="cell"
          />
          <StatCard
            icon={Trash2}
            label="Remover"
            theme="amber"
            value={lastRun.plan.unpublish}
            variant="cell"
          />
          <StatCard
            icon={Ban}
            label="Bloqueados"
            theme="amber"
            value={lastRun.plan.blocked}
            variant="cell"
          />
        </div>
      ) : null}
    </section>
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
