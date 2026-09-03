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
  formatInventoryPrice,
  getInventoryDisplayStatus,
  getInventoryFipeComparison,
  getInventoryKm,
  getInventoryPlate,
  getInventoryStockDays,
  getInventoryVehicleSubtitle,
  getInventoryVehicleTitle,
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
      {Array.from({ length: 10 }).map((_, item) => (
        <div
          aria-hidden="true"
          className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm"
          key={item}
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-app-elevated" />
          <div className="flex flex-1 flex-col justify-between gap-3 p-3">
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-app-elevated" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-app-elevated" />
            </div>
            <div className="flex items-center gap-2 border-t border-line/20 pt-2">
              <div className="h-5 w-16 animate-pulse rounded bg-app-elevated" />
              <div className="h-3 w-12 animate-pulse rounded bg-app-elevated" />
              <div className="h-3 w-12 animate-pulse rounded bg-app-elevated" />
            </div>
            <div className="flex items-center justify-between border-t border-line/20 pt-2">
              <div className="h-5 w-24 animate-pulse rounded bg-app-elevated" />
              <div className="h-7 w-16 animate-pulse rounded-lg bg-app-elevated" />
            </div>
          </div>
        </div>
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
  const km = getInventoryKm(listing.mileageKm);
  const days = getInventoryStockDays(listing.createdAt);
  const fipe = getInventoryFipeComparison(
    listing.priceCents,
    listing.catalog?.priceCents ?? null,
  );
  const fipePercentage = fipe?.percentage ?? 0;
  const fipeIsBelow = fipe?.isBelow ?? false;
  const leads = item.leadsCount;
  const vehicleTitle = getInventoryVehicleTitle(listing);
  const vehicleSubtitle = getInventoryVehicleSubtitle(listing, listing.catalog);

  return (
    <motion.article
      className="glass-panel-branded group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-panel !p-0 shadow-sm transition-all duration-200 hover:border-accent/40 hover:shadow-md"
      onClick={() => onSelect(listing.id, item.primaryUnit?.id ?? null)}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -3 }}
    >
      <div className="relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden border-b border-line/30 bg-app-elevated">
        {item.primaryMediaUrl ? (
          <>
            <ImageWithFallback
              alt={listing.title}
              className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
              className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/40 to-transparent"
              data-photo-gradient="depth"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10 bg-accent"
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
          className="pointer-events-none absolute inset-0 flex items-end justify-end p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          data-card-hover-overlay
        >
          <span className="flex items-center gap-1 rounded-lg border border-line/60 bg-panel/90 px-2 py-1 text-xs font-bold text-app-text shadow-sm backdrop-blur-md">
            <span>Abrir</span>
            <ChevronRight aria-hidden="true" className="size-3 text-accent" />
          </span>
        </div>

        <div className="absolute left-2.5 top-2.5 z-10">
          <StatusPill status={getInventoryDisplayStatus(item)} />
        </div>
        <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1.5">
          <div
            className={
              "flex items-center gap-1 rounded-full border border-line/40 bg-panel/90 px-2 py-0.5 text-xs font-black shadow-sm backdrop-blur-md " +
              (days > 30 ? "text-amber-500" : "text-muted")
            }
          >
            <Clock aria-hidden="true" className="size-2.5" />
            <span>{days}d</span>
          </div>
          <div className="rounded-full border border-line/40 bg-panel/90 px-2 py-0.5 text-xs font-black text-app-text shadow-sm backdrop-blur-md">
            {item.mediaCount} {item.mediaCount === 1 ? "mídia" : "mídias"}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2.5 p-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-app-text transition-colors group-hover:text-accent">
            {vehicleTitle}
          </h3>
          <p className="mt-0.5 truncate text-xs font-semibold text-muted">
            {vehicleSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-line/20 pt-2 text-xs font-semibold text-muted">
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

        <div className="mt-auto flex items-center justify-between border-t border-line/20 pt-2.5">
          <div className="flex flex-col justify-center min-w-0">
            <span
              className={
                "text-base font-black leading-none " +
                (fipePercentage > 10
                  ? "text-accent-strong"
                  : fipePercentage > 3
                    ? "text-amber-500"
                    : fipePercentage > 0 || fipeIsBelow
                      ? "text-emerald-500"
                      : "text-app-text")
              }
            >
              {formatInventoryPrice(listing.priceCents)}
            </span>
            {fipe && fipe.percentage !== 0 ? (
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
            ) : (
              <span className="mt-1 text-xs font-medium leading-none text-muted/50">
                Sem ref. FIPE
              </span>
            )}
          </div>

          {onAction ? (
            <div
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                aria-label={`Criar post para ${listing.title}`}
                className="flex size-7 items-center justify-center rounded-lg border border-line/60 bg-panel/90 text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-200 transition-all hover:border-violet-500/40 hover:bg-violet-500/10 active:scale-95"
                onClick={() => onAction("template", item)}
                title="Criar post"
                type="button"
              >
                <LayoutTemplate aria-hidden="true" className="size-3.5" />
              </button>
              <button
                aria-label={`Agendar test drive para ${listing.title}`}
                className="flex size-7 items-center justify-center rounded-lg border border-line/60 bg-panel/90 text-emerald-500 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 active:scale-95"
                onClick={() => onAction("test-drive", item)}
                title="Test drive"
                type="button"
              >
                <CalendarClock aria-hidden="true" className="size-3.5" />
              </button>
              {item.mediaCount > 0 ? (
                <button
                  aria-label={`Baixar fotos de ${listing.title}`}
                  className="flex size-7 items-center justify-center rounded-lg border border-line/60 bg-panel/90 text-accent transition-all hover:border-accent/40 hover:bg-accent-soft hover:text-accent-strong active:scale-95"
                  onClick={() => onAction("zip-photos", item)}
                  title="Baixar fotos em ZIP"
                  type="button"
                >
                  <FileArchive aria-hidden="true" className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

export function EmptyCatalog({ body, title }: { body: string; title: string }) {
  return <FeatureEmptyState body={body} icon={CarFront} title={title} />;
}
