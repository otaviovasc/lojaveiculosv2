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
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
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
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          aria-hidden="true"
          className="min-h-[356px] animate-pulse rounded-2xl border border-line bg-panel shadow-[var(--shadow-panel)]"
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="glass-panel-branded flex flex-col h-full group cursor-pointer relative overflow-hidden border border-line hover:border-accent/40 shadow-sm"
      onClick={() => onSelect(listing.id)}
    >
      {/* Photo with Overlay on Hover */}
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-app-elevated border-b border-line/30">
        {item.primaryMediaUrl ? (
          <img
            alt={listing.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={item.primaryMediaUrl}
          />
        ) : (
          <CarFront aria-hidden="true" className="size-10 text-muted/50" />
        )}

        {/* Workspace Overlay on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[2px]">
          <span className="bg-panel text-app-text font-black text-xs px-3.5 py-2 rounded-xl shadow-lg border border-line flex items-center gap-1.5">
            <span>Abrir Workspace</span>
            <ChevronRight className="size-3.5 text-accent" />
          </span>
        </div>

        <div className="absolute left-2 top-2">
          <StatusPill status={listing.status} />
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-panel/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-black text-app-text border border-line/30 shadow-sm">
          {item.mediaCount} mídia(s)
        </div>
      </div>

      {/* Content Body */}
      <div className="flex flex-col gap-2.5 p-3.5 flex-grow">
        <div className="min-w-0">
          <h3 className="truncate text-sm md:text-base font-black text-app-text group-hover:text-accent transition-colors flex items-center gap-1">
            <span className="truncate">{listing.title}</span>
          </h3>
          <p className="truncate text-[10px] font-bold text-muted mt-0.5">
            {getInventoryCatalogLine(listing.catalog, listing)}
          </p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-3 gap-2 border-y border-line/30 py-2.5 my-0.5">
          <MetaItem
            icon={
              <CalendarDays
                aria-hidden="true"
                className="size-3.5 text-violet-500"
              />
            }
            label="Ano"
            value={getInventoryYearLine(listing)}
          />
          <MetaItem
            icon={
              <KeyRound
                aria-hidden="true"
                className="size-3.5 text-emerald-500"
              />
            }
            label="Placa"
            value={getInventoryPlate(item)}
          />
          <MetaItem
            icon={
              <ImageIcon
                aria-hidden="true"
                className="size-3.5 text-pink-500"
              />
            }
            label="Estoque"
            value={getInventoryStockLabel(item)}
          />
        </div>

        {/* Footer Row (Price and Menu) */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-line/20">
          <span className="text-base font-black text-accent-strong">
            {formatInventoryPrice(listing.priceCents)}
          </span>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg bg-app-elevated border border-line text-muted hover:bg-accent-soft hover:text-accent-strong transition-all cursor-pointer"
              title="Mais Ações"
            >
              <MoreVertical className="size-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute bottom-10 right-0 z-30 w-44 rounded-xl border border-line bg-panel p-1.5 shadow-2xl">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onAction?.("template", item);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-black text-app-text hover:bg-line/25 cursor-pointer"
                >
                  <ImageIcon className="size-3 text-violet-500" />
                  Criar Template
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onAction?.("test-drive", item);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-black text-app-text hover:bg-line/25 cursor-pointer"
                >
                  <Printer className="size-3 text-emerald-500" />
                  Test Drive
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onAction?.("zip-photos", item);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-black text-app-text hover:bg-line/25 cursor-pointer"
                >
                  <FileArchive className="size-3 text-pink-500" />
                  Baixar Fotos (ZIP)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function EmptyCatalog({ body, title }: { body: string; title: string }) {
  return (
    <div className="glass-panel-branded p-12 text-center flex flex-col items-center justify-center">
      <CarFront aria-hidden="true" className="mb-4 size-14 text-muted" />
      <h3 className="text-xl font-black text-app-text">{title}</h3>
      <p className="mt-2 text-sm font-bold text-muted max-w-md">{body}</p>
    </div>
  );
}

function IconAction({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={label}
      title={label}
      type="button"
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-app-elevated border border-line text-muted transition-colors hover:bg-accent-soft hover:text-accent-strong hover:border-accent-soft/30 cursor-pointer shadow-sm w-full"
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-app border border-line/40 shadow-inner shrink-0">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-wider text-muted/80">
          {label}
        </span>
        <span className="block truncate text-sm font-black text-app-text mt-0.5">
          {value}
        </span>
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: InventoryListingStatus }) {
  const tone =
    status === "available"
      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
      : status === "reserved"
        ? "bg-warning/10 text-warning border border-warning/20"
        : status === "sold"
          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
          : "bg-panel text-muted border border-line";

  const dotColor =
    status === "available"
      ? "bg-emerald-500"
      : status === "reserved"
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
