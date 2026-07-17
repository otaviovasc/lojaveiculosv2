import {
  CalendarClock,
  CarFront,
  FileArchive,
  ChevronRight,
  Clock,
  LayoutTemplate,
} from "lucide-react";
import { motion } from "motion/react";
import { FeatureEmptyState } from "../../../components/ui/FeatureStates";
import { ImageWithFallback } from "../../../components/ui/ImageWithFallback";
import {
  FeatureRowAction,
  FeatureRowActions,
} from "../../../components/ui/FeatureTable";
import {
  formatInventoryPrice,
  getInventoryCatalogLine,
  getInventoryDisplayStatus,
  getInventoryFipeComparison,
  getInventoryKm,
  getInventoryLeadsCount,
  getInventoryPlate,
  getInventoryStockDays,
  getInventoryYearLine,
} from "../model/listCatalogModel";
import type { InventoryListingSummary } from "../model/types";
import { InventoryLeadBadge } from "./InventoryLeadBadge";
import { MercosulPlateBadge, StatusPill } from "./InventoryListingBadges";

export { MercosulPlateBadge } from "./InventoryListingBadges";

type InventoryCardAction = "template" | "test-drive" | "zip-photos";

export function InventoryListingCardGrid({
  items,
  onSelect,
  onAction,
}: {
  items: readonly InventoryListingSummary[];
  onSelect: (listingId: string, unitId?: string | null) => void;
  onAction?:
    | ((action: InventoryCardAction, item: InventoryListingSummary) => void)
    | undefined;
}) {
  if (items.length === 0) {
    return (
      <EmptyCatalog
        body="Tente ajustar os filtros de busca ou cadastre o primeiro veículo."
        title="Nenhum veículo encontrado"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {items.map((item) => (
        <InventoryListingCard
          item={item}
          key={item.primaryUnit?.id ?? item.listing.id}
          onAction={onAction}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function InventoryListingLoadingGrid() {
  return (
    <div
      aria-label="Carregando veículos"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      role="status"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
        <div
          aria-hidden="true"
          className="min-h-[280px] animate-pulse rounded-2xl border border-line bg-panel shadow-[var(--shadow-panel)]"
          key={item}
        />
      ))}
    </div>
  );
}

export function InventoryListingError({ message }: { message: string }) {
  return (
    <EmptyCatalog
      body={message}
      title="Não foi possível carregar o inventário"
    />
  );
}

function InventoryListingCard({
  item,
  onSelect,
  onAction,
}: {
  item: InventoryListingSummary;
  onSelect: (listingId: string, unitId?: string | null) => void;
  onAction?:
    | ((action: InventoryCardAction, item: InventoryListingSummary) => void)
    | undefined;
}) {
  const listing = item.listing;
  const plate = getInventoryPlate(item);
  const km = getInventoryKm(listing.id, listing.modelYear);
  const days = getInventoryStockDays(listing.createdAt, listing.id);
  const fipe = getInventoryFipeComparison(listing.priceCents, listing.id);
  const leads = getInventoryLeadsCount(listing.id);

  return (
    <motion.article
      className="glass-panel-branded hover-shift group relative flex h-full cursor-pointer flex-col overflow-hidden border border-line !p-0 shadow-sm transition-colors hover:border-accent/40"
      onClick={() => onSelect(listing.id, item.primaryUnit?.id ?? null)}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <div className="relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden border-b border-line/30 bg-app-elevated">
        {item.primaryMediaUrl ? (
          <>
            <ImageWithFallback
              alt={listing.title}
              className="block h-full w-full object-cover transition-[filter,transform] duration-500 group-hover:scale-105 group-hover:blur-[2px]"
              fallback={
                <span className="flex size-full flex-col items-center justify-center gap-1.5 text-muted/60">
                  <CarFront aria-hidden="true" className="size-8" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Fotos em breve
                  </span>
                </span>
              }
              src={item.primaryMediaUrl}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10 opacity-70 transition-opacity duration-500 group-hover:opacity-50"
              data-photo-gradient="depth"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-black/20 opacity-50 mix-blend-soft-light transition-opacity duration-500 group-hover:opacity-70"
              data-photo-gradient="brand"
            />
          </>
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1.5 text-muted/60">
            <CarFront aria-hidden="true" className="size-8" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Fotos em breve
            </span>
          </span>
        )}

        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          data-card-hover-overlay
        >
          <span className="flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-xs font-black text-app-text shadow-lg">
            <span>Workspace</span>
            <ChevronRight aria-hidden="true" className="size-3 text-accent" />
          </span>
        </div>

        <div className="absolute left-2 top-2">
          <StatusPill status={getInventoryDisplayStatus(item)} />
        </div>
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <div
            className={
              "flex items-center gap-1 rounded-full border border-line/30 bg-panel/90 px-2 py-0.5 text-xs font-black shadow-sm backdrop-blur-md " +
              (days > 30 ? "text-amber-500" : "text-muted")
            }
          >
            <Clock aria-hidden="true" className="size-2.5" />
            <span>{days}d</span>
          </div>
          <div className="rounded-full border border-line/30 bg-panel/90 px-2 py-0.5 text-xs font-black text-app-text shadow-sm backdrop-blur-md">
            {item.mediaCount} mídias
          </div>
        </div>
      </div>

      <div className="flex flex-grow flex-col justify-between gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-app-text transition-colors group-hover:text-accent">
            {listing.title}
          </h3>
          <p className="mt-0.5 truncate text-xs font-bold text-muted">
            {getInventoryCatalogLine(listing.catalog, listing)}
          </p>
        </div>

        <div className="my-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-line/20 pt-2 text-xs font-bold text-muted">
          {plate && plate !== "-" ? <MercosulPlateBadge plate={plate} /> : null}
          <span>{getInventoryYearLine(listing)}</span>
          <span className="text-line">•</span>
          <span>{km}</span>
          {leads > 0 ? (
            <>
              <span className="text-line">•</span>
              <InventoryLeadBadge leads={leads} variant="compact" />
            </>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-line/20 pt-2">
          <div className="flex flex-col">
            <span
              className={
                "text-sm font-black leading-none " +
                (fipe.percentage > 10
                  ? "text-accent-strong"
                  : fipe.percentage > 3
                    ? "text-amber-500"
                    : fipe.percentage > 0 || fipe.isBelow
                      ? "text-emerald-500"
                      : "text-app-text")
              }
            >
              {formatInventoryPrice(listing.priceCents)}
            </span>
            {fipe.percentage !== 0 ? (
              <span
                className={
                  "mt-1 text-xs font-black leading-none " +
                  (fipe.isBelow || fipe.percentage <= 3
                    ? "text-emerald-500"
                    : fipe.percentage > 10
                      ? "text-accent-strong"
                      : "text-amber-500")
                }
              >
                {fipe.label}
              </span>
            ) : null}
          </div>

          {onAction ? (
            <FeatureRowActions className="h-auto gap-1">
              <FeatureRowAction
                ariaLabel={`Criar post para ${listing.title}`}
                icon={LayoutTemplate}
                iconClassName="text-accent"
                onClick={(event) => {
                  event.stopPropagation();
                  onAction("template", item);
                }}
                tooltip="Criar post"
              />
              <FeatureRowAction
                ariaLabel={`Agendar test drive para ${listing.title}`}
                icon={CalendarClock}
                iconClassName="text-success"
                onClick={(event) => {
                  event.stopPropagation();
                  onAction("test-drive", item);
                }}
                tooltip="Test drive"
              />
              {item.mediaCount > 0 ? (
                <FeatureRowAction
                  ariaLabel={`Baixar fotos de ${listing.title}`}
                  icon={FileArchive}
                  iconClassName="text-accent"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAction("zip-photos", item);
                  }}
                  tooltip="Baixar fotos em ZIP"
                />
              ) : null}
            </FeatureRowActions>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

export function EmptyCatalog({ body, title }: { body: string; title: string }) {
  return <FeatureEmptyState body={body} icon={CarFront} title={title} />;
}
