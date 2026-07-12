import { CarFront, ChevronRight, Clock, FileArchive } from "lucide-react";
import { motion } from "motion/react";
import { FeatureEmptyState } from "../../../components/ui/FeatureStates";
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
  inventoryStatusLabels,
  inventoryUnitStatusLabels,
  type InventoryDisplayStatus,
} from "../model/listCatalogModel";
import type {
  InventoryListingSummary,
  InventoryUnitStatus,
} from "../model/types";
import { InventoryLeadBadge } from "./InventoryLeadBadge";

type InventoryCardAction = "zip-photos";

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
      className="glass-panel-branded hover-shift group relative flex h-full cursor-pointer flex-col overflow-hidden border border-line shadow-sm transition-colors hover:border-accent/40"
      onClick={() => onSelect(listing.id, item.primaryUnit?.id ?? null)}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden border-b border-line/30 bg-app-elevated">
        {item.primaryMediaUrl ? (
          <img
            alt={listing.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={item.primaryMediaUrl}
          />
        ) : (
          <CarFront aria-hidden="true" className="size-8 text-muted/50" />
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
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

          {onAction && item.mediaCount > 0 ? (
            <button
              aria-label={`Baixar fotos de ${listing.title}`}
              className="cursor-pointer rounded-lg border border-line bg-panel p-1.5 text-accent transition-all hover:border-accent/30 hover:bg-accent-soft hover:text-accent-strong"
              onClick={(event) => {
                event.stopPropagation();
                onAction("zip-photos", item);
              }}
              title="Baixar Fotos (ZIP)"
              type="button"
            >
              <FileArchive aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

export function EmptyCatalog({ body, title }: { body: string; title: string }) {
  return <FeatureEmptyState body={body} icon={CarFront} title={title} />;
}

export function StatusPill({ status }: { status: InventoryDisplayStatus }) {
  const tone =
    status === "published" || status === "available"
      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
      : status === "in_preparation" || status === "reserved"
        ? "bg-warning/10 text-warning border border-warning/20"
        : status === "sold_out" || status === "sold" || status === "delivered"
          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
          : status === "acquired"
            ? "bg-violet-500/10 text-violet-500 border border-violet-500/20"
            : "bg-panel text-muted border border-line";
  const dotColor =
    status === "published" || status === "available"
      ? "bg-emerald-500"
      : status === "in_preparation" || status === "reserved"
        ? "bg-warning"
        : status === "sold_out" || status === "sold" || status === "delivered"
          ? "bg-blue-500"
          : status === "acquired"
            ? "bg-violet-500"
            : "bg-muted";
  const label = isInventoryUnitStatus(status)
    ? inventoryUnitStatusLabels[status]
    : inventoryStatusLabels[status];

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-md " +
        tone
      }
    >
      <span className={"size-1.5 rounded-full " + dotColor} />
      {label}
    </span>
  );
}

function isInventoryUnitStatus(
  status: InventoryDisplayStatus,
): status is InventoryUnitStatus {
  return status in inventoryUnitStatusLabels;
}

export function MercosulPlateBadge({ plate }: { plate: string }) {
  if (!plate || plate === "-") {
    return <span className="text-xs text-muted">-</span>;
  }

  const formatted = plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return (
    <span
      aria-label={`Placa ${formatted}`}
      className="inline-flex min-w-[70px] max-w-[80px] shrink-0 select-none flex-col overflow-hidden rounded-[3px] border border-gray-300 bg-white text-center align-middle shadow-sm dark:border-line dark:bg-white"
    >
      <span className="bg-blue-600 px-1 py-0.5 text-center text-xs font-black uppercase leading-none tracking-widest text-white dark:bg-blue-600">
        Brasil
      </span>
      <span className="px-1.5 py-0.5 font-mono text-xs font-bold leading-none tracking-wider text-gray-900">
        {formatted}
      </span>
    </span>
  );
}
