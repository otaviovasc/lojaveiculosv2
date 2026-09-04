import { Clock3, EyeOff, ListChecks, Search, Send, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
import { providerLabels } from "./marketplaceLabels";
import { MarketplaceStockVehicleCard } from "./MarketplaceStockVehicleCard";
import type {
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
  const [filter, setFilter] = useState<FilterOption>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const description = lastRun
    ? `${providerLabels[lastRun.provider]} · último lote desta sessão`
    : provider
      ? `Prévia do ${providerLabels[provider]} antes de enfileirar o lote.`
      : "Selecione um provedor antes de enfileirar o lote.";

  return (
    <FeatureSection
      className="marketplace-stock-section"
      description={description}
      padding="comfortable"
      radius="xl"
      title="Prévia e envios"
      titleClassName="text-xl md:text-2xl font-black tracking-tight"
    >
      {plan ? (
        <div className="marketplace-stock-panel">
          <FeatureKpiStrip ariaLabel="Contabilidade completa do estoque">
            <FeatureKpiCard
              active={filter === "all"}
              icon={ListChecks}
              label="Estoque encontrado"
              onClick={() => setFilter("all")}
              tone="blue"
              value={plan.accounting.found}
            />
            <FeatureKpiCard
              active={filter === "ready"}
              icon={Send}
              label="Prontos para publicar"
              onClick={() => setFilter("ready")}
              tone="green"
              value={plan.accounting.ready}
            />
            <FeatureKpiCard
              active={filter === "needs_correction"}
              icon={Wrench}
              label="Precisam de correção"
              onClick={() => setFilter("needs_correction")}
              tone="pink"
              value={plan.accounting.needsCorrection}
            />
            <FeatureKpiCard
              active={filter === "excluded"}
              icon={EyeOff}
              label="Fora da publicação"
              onClick={() => setFilter("excluded")}
              tone="violet"
              value={plan.accounting.excluded}
            />
            <FeatureKpiCard
              active={filter === "processing"}
              icon={Clock3}
              label="Em processamento"
              onClick={() => setFilter("processing")}
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
          <MarketplaceStockItemList
            filter={filter}
            items={plan.items}
            onFilterChange={setFilter}
            onSearchChange={setSearchTerm}
            searchTerm={searchTerm}
          />
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

type FilterOption = "all" | MarketplaceStockAccountingStatus;

function MarketplaceStockItemList({
  filter,
  items,
  onFilterChange,
  onSearchChange,
  searchTerm,
}: {
  filter: FilterOption;
  items: MarketplaceStockPlanItem[];
  onFilterChange: (filter: FilterOption) => void;
  onSearchChange: (search: string) => void;
  searchTerm: string;
}) {
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter !== "all" && item.accountingStatus !== filter) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const title = (
        item.listing.stockLabel ?? item.listing.title
      ).toLowerCase();
      const plate = (item.listing.licensePlate ?? "").toLowerCase();
      const trim = (item.listing.trimName ?? "").toLowerCase();
      return (
        title.includes(term) || plate.includes(term) || trim.includes(term)
      );
    });
  }, [items, filter, searchTerm]);

  const readyCount = items.filter((i) => i.accountingStatus === "ready").length;
  const pendingCount = items.filter(
    (i) => i.accountingStatus === "needs_correction",
  ).length;
  const excludedCount = items.filter(
    (i) => i.accountingStatus === "excluded",
  ).length;

  return (
    <section className="marketplace-stock-items">
      <div className="marketplace-stock-items__toolbar">
        <div className="marketplace-stock-items__title-wrap">
          <h4>Situação de cada veículo</h4>
          <span className="marketplace-stock-items__count-badge">
            {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "veículo" : "veículos"}
          </span>
        </div>
        <div className="marketplace-stock-items__controls">
          <div className="marketplace-stock-items__search-wrap">
            <Search
              aria-hidden="true"
              className="marketplace-stock-items__search-icon"
            />
            <input
              aria-label="Buscar veículo no lote"
              className="marketplace-stock-items__search-input"
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por veículo ou placa..."
              type="search"
              value={searchTerm}
            />
          </div>
          <div
            aria-label="Filtrar por status"
            className="marketplace-stock-items__filters"
            role="radiogroup"
          >
            <button
              aria-checked={filter === "all"}
              className={`marketplace-stock-filter-btn ${filter === "all" ? "is-active" : ""}`}
              onClick={() => onFilterChange("all")}
              role="radio"
              type="button"
            >
              Todos ({items.length})
            </button>
            <button
              aria-checked={filter === "ready"}
              className={`marketplace-stock-filter-btn ${filter === "ready" ? "is-active" : ""}`}
              onClick={() => onFilterChange("ready")}
              role="radio"
              type="button"
            >
              Prontos ({readyCount})
            </button>
            <button
              aria-checked={filter === "needs_correction"}
              className={`marketplace-stock-filter-btn ${filter === "needs_correction" ? "is-active" : ""}`}
              onClick={() => onFilterChange("needs_correction")}
              role="radio"
              type="button"
            >
              Pendências ({pendingCount})
            </button>
            <button
              aria-checked={filter === "excluded"}
              className={`marketplace-stock-filter-btn ${filter === "excluded" ? "is-active" : ""}`}
              onClick={() => onFilterChange("excluded")}
              role="radio"
              type="button"
            >
              Fora do lote ({excludedCount})
            </button>
          </div>
        </div>
      </div>

      {filteredItems.length ? (
        <ul className="marketplace-vehicle-cards-list">
          {filteredItems.map((item) => (
            <MarketplaceStockVehicleCard
              item={item}
              key={item.listing.listingId}
            />
          ))}
        </ul>
      ) : (
        <div className="marketplace-stock-items__no-match">
          <p>
            {items.length === 0
              ? "Nenhum veículo foi encontrado nesta prévia."
              : "Nenhum veículo corresponde ao filtro selecionado."}
          </p>
          {searchTerm || filter !== "all" ? (
            <button
              className="marketplace-stock-items__reset-btn"
              onClick={() => {
                onFilterChange("all");
                onSearchChange("");
              }}
              type="button"
            >
              Limpar filtros e busca
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
