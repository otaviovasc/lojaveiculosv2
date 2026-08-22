import { useState } from "react";
import { CarFront, Check, Sparkles } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import {
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { FeatureSearchField } from "../../components/ui/FeatureControls";
import { ImageWithFallback } from "../../components/ui/ImageWithFallback";
import {
  MercosulPlateBadge,
  StatusPill,
} from "../inventory/components/InventoryListingBadges";
import {
  formatInventoryPrice,
  getInventoryCatalogLine,
  getInventoryDisplayStatus,
  getInventoryPlate,
  getInventoryYearLine,
} from "../inventory/model/listCatalogModel";
import type { InventoryListingSummary } from "../inventory/model/types";

export function SimulationStockVehicleModal({
  isOpen,
  items,
  onClose,
  onSelect,
  status,
}: {
  isOpen: boolean;
  items: readonly InventoryListingSummary[];
  onClose: () => void;
  onSelect: (item: InventoryListingSummary) => void;
  status: "error" | "loading" | "ready";
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const title = item.listing.title.toLowerCase();
    const plate = getInventoryPlate(item).toLowerCase();
    const catalog = getInventoryCatalogLine(
      item.listing.catalog,
      item.listing,
    ).toLowerCase();
    const stockNum = item.primaryUnit?.stockNumber?.toLowerCase() ?? "";
    return (
      title.includes(query) ||
      plate.includes(query) ||
      catalog.includes(query) ||
      stockNum.includes(query)
    );
  });

  return (
    <FeatureDialog
      className="feature-dialog--large max-w-4xl"
      description="Escolha um veículo do estoque cadastrado para preencher automaticamente o ano, valores e código FIPE."
      icon={<CarFront className="size-5 text-accent" />}
      isOpen={isOpen}
      onClose={onClose}
      title="Selecionar veículo do estoque"
    >
      <div className="grid gap-4">
        <FeatureSearchField
          autoFocus
          label="Buscar veículo no estoque"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por modelo, marca, placa ou número de estoque..."
          value={searchQuery}
        />

        {status === "loading" ? (
          <FeatureLoadingState
            density="compact"
            title="Carregando estoque..."
          />
        ) : status === "error" ? (
          <FeatureEmptyState
            body="Não foi possível carregar o estoque no momento. Tente utilizar o Catálogo FIPE."
            icon={CarFront}
            title="Estoque indisponível"
          />
        ) : filteredItems.length === 0 ? (
          <FeatureEmptyState
            body={
              searchQuery
                ? `Nenhum veículo encontrado para "${searchQuery}". Tente outros termos.`
                : "Nenhum veículo disponível no estoque da loja."
            }
            icon={CarFront}
            title="Nenhum veículo encontrado"
          />
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const listing = item.listing;
                const plate = getInventoryPlate(item);
                const catalogLine = getInventoryCatalogLine(
                  listing.catalog,
                  listing,
                );
                const yearLine = getInventoryYearLine(listing);
                const priceFormatted = formatInventoryPrice(listing.priceCents);

                return (
                  <button
                    className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-panel p-0 text-left transition-colors hover:border-accent/50"
                    key={item.primaryUnit?.id ?? listing.id}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    type="button"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-app-elevated">
                      {item.primaryMediaUrl ? (
                        <ImageWithFallback
                          alt={listing.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          fallback={
                            <div className="flex size-full items-center justify-center text-muted">
                              <CarFront className="size-8" />
                            </div>
                          }
                          src={item.primaryMediaUrl}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted">
                          <CarFront className="size-8" />
                        </div>
                      )}
                      <div className="absolute left-2 top-2">
                        <StatusPill status={getInventoryDisplayStatus(item)} />
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-3.5">
                      <div>
                        <h4 className="line-clamp-1 text-sm font-black text-app-text group-hover:text-accent">
                          {listing.title}
                        </h4>
                        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-muted">
                          {catalogLine}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/30 pt-2.5 text-xs font-semibold text-muted">
                        {plate && plate !== "-" ? (
                          <MercosulPlateBadge plate={plate} />
                        ) : null}
                        <span>{yearLine}</span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-line/30 pt-2.5">
                        <span className="text-sm font-black text-accent-strong">
                          {priceFormatted}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-xl bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-strong transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                          <Check className="size-3.5" />
                          <span>Selecionar</span>
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </FeatureDialog>
  );
}
