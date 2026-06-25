import {
  CalendarDays,
  Car,
  CarFront,
  CircleDollarSign,
  Eye,
  Image as ImageIcon,
  KeyRound,
  Pencil,
  MoreVertical,
  Printer,
  FileArchive,
  ChevronRight,
  Clock,
  Flame,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  formatInventoryPrice,
  getInventoryCatalogLine,
  getInventoryPlate,
  getInventoryStockLabel,
  getInventoryYearLine,
  inventoryStatusLabels,
  getInventoryKm,
  getInventoryStockDays,
  getInventoryFipeComparison,
  getInventoryLeadsCount,
} from "../model/listCatalogModel";
import type {
  InventoryListingStatus,
  InventoryListingSummary,
} from "../model/types";

export function InventoryListingCardGrid({
  items,
  onSelect,
  onAction,
}: {
  items: readonly InventoryListingSummary[];
  onSelect: (listingId: string) => void;
  onAction?:
    | ((
        action: "template" | "test-drive" | "zip-photos",
        item: InventoryListingSummary,
      ) => void)
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
          key={item.listing.id}
          onSelect={onSelect}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

export function InventoryListingLoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
  onSelect: (listingId: string) => void;
  onAction?:
    | ((
        action: "template" | "test-drive" | "zip-photos",
        item: InventoryListingSummary,
      ) => void)
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
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="glass-panel-branded flex flex-col h-full group cursor-pointer relative overflow-hidden border border-line hover:border-accent/40 shadow-sm"
      onClick={() => onSelect(listing.id)}
    >
      {/* Photo with Overlay on Hover */}
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-app-elevated border-b border-line/30">
        {item.primaryMediaUrl ? (
          <img
            alt={listing.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={item.primaryMediaUrl}
          />
        ) : (
          <CarFront aria-hidden="true" className="size-8 text-muted/50" />
        )}

        {/* Workspace Overlay on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[2px]">
          <span className="bg-panel text-app-text font-black text-xs px-3 py-1.5 rounded-xl shadow-lg border border-line flex items-center gap-1.5">
            <span>Workspace</span>
            <ChevronRight className="size-3 text-accent" />
          </span>
        </div>

        <div className="absolute left-2 top-2">
          <StatusPill status={listing.status} />
        </div>
        <div className="absolute right-2 top-2 flex gap-1 z-10">
          <div className="rounded-full bg-panel/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-black text-violet-500 border border-line/30 shadow-sm flex items-center gap-1">
            <Clock className="size-2.5" />
            <span>{days}d</span>
          </div>
          <div className="rounded-full bg-panel/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-black text-app-text border border-line/30 shadow-sm">
            {item.mediaCount} mídias
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex flex-col gap-2 p-3 flex-grow justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-app-text group-hover:text-accent transition-colors">
            {listing.title}
          </h3>
          <p className="truncate text-[10px] font-bold text-muted mt-0.5">
            {getInventoryCatalogLine(listing.catalog, listing)}
          </p>
        </div>

        {/* Dense Specs Row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 my-1 text-[11px] font-bold text-muted border-t border-line/20 pt-2">
          {plate && plate !== "-" && <MercosulPlateBadge plate={plate} />}
          <span>{getInventoryYearLine(listing)}</span>
          <span className="text-line">•</span>
          <span>{km}</span>
          {leads > 0 && (
            <>
              <span className="text-line">•</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black bg-accent-soft/30 text-accent-strong px-1.5 py-0.5 rounded">
                <Flame className="size-3 text-accent" />
                <span>
                  {leads} {leads === 1 ? "lead" : "leads"}
                </span>
              </span>
            </>
          )}
        </div>

        {/* Footer Row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-line/20">
          <div className="flex flex-col">
            <span className="text-sm font-black text-accent-strong leading-none">
              {formatInventoryPrice(listing.priceCents)}
            </span>
            {fipe.percentage !== 0 && (
              <span
                className={
                  "text-[10px] font-black mt-1 leading-none " +
                  (fipe.isBelow ? "text-emerald-500" : "text-amber-500")
                }
              >
                {fipe.label}
              </span>
            )}
          </div>

          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onAction?.("template", item)}
              className="p-1.5 rounded-lg bg-app-elevated border border-line text-muted hover:bg-accent-soft hover:text-accent-strong transition-all cursor-pointer"
              title="Criar Template"
              type="button"
            >
              <ImageIcon className="size-3.5 text-violet-500" />
            </button>
            <button
              onClick={() => onAction?.("test-drive", item)}
              className="p-1.5 rounded-lg bg-app-elevated border border-line text-muted hover:bg-accent-soft hover:text-accent-strong transition-all cursor-pointer"
              title="Test Drive"
              type="button"
            >
              <Printer className="size-3.5 text-emerald-500" />
            </button>
            <button
              onClick={() => onAction?.("zip-photos", item)}
              className="p-1.5 rounded-lg bg-app-elevated border border-line text-muted hover:bg-accent-soft hover:text-accent-strong transition-all cursor-pointer"
              title="Baixar Fotos (ZIP)"
              type="button"
            >
              <FileArchive className="size-3.5 text-pink-500" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function EmptyCatalog({ body, title }: { body: string; title: string }) {
  return (
    <div className="glass-panel-branded p-12 text-center flex flex-col items-center justify-center">
      <CarFront aria-hidden="true" className="mb-4 size-14 text-muted" />
      <h3 className="text-xl font-black text-app-text">{title}</h3>
      <p className="mt-2 text-sm font-bold text-muted max-w-md">{body}</p>
    </div>
  );
}

export function StatusPill({ status }: { status: InventoryListingStatus }) {
  const tone =
    status === "available"
      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
      : status === "reserved"
        ? "bg-warning/10 text-warning border border-warning/20"
        : status === "in_preparation"
          ? "bg-warning/10 text-warning border border-warning/20"
          : status === "sold"
            ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
            : "bg-panel text-muted border border-line";

  const dotColor =
    status === "available"
      ? "bg-emerald-500"
      : status === "reserved"
        ? "bg-warning"
        : status === "in_preparation"
          ? "bg-warning"
          : status === "sold"
            ? "bg-blue-500"
            : "bg-muted";

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-md " +
        tone
      }
    >
      <span className={"size-1.5 rounded-full " + dotColor} />
      {inventoryStatusLabels[status]}
    </span>
  );
}

export function MercosulPlateBadge({ plate }: { plate: string }) {
  if (!plate || plate === "-") {
    return <span className="text-muted text-xs">-</span>;
  }

  const formatted = plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return (
    <span className="inline-flex align-middle flex-col overflow-hidden rounded-[3px] border border-gray-300 dark:border-line bg-white dark:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] min-w-[70px] max-w-[80px] text-center select-none shrink-0">
      <span className="bg-blue-600 dark:bg-blue-600 px-1 py-0.5 text-[6.5px] font-black tracking-widest text-white uppercase leading-none text-center">
        Brasil
      </span>
      <span className="px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-gray-900 leading-none">
        {formatted}
      </span>
    </span>
  );
}
