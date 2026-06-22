import {
  CalendarDays,
  Car,
  CircleDollarSign,
  Eye,
  Image,
  KeyRound,
  Pencil,
} from "lucide-react";
import type { ReactNode } from "react";
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
}: {
  items: readonly InventoryListingSummary[];
  onSelect: (listingId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyCatalog
        body="Tente ajustar os filtros de busca ou cadastre o primeiro veiculo."
        title="Nenhum veiculo encontrado"
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {items.map((item) => (
        <InventoryListingCard
          item={item}
          key={item.listing.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function InventoryListingLoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          aria-hidden="true"
          className="min-h-[356px] animate-pulse rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]"
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
      title="Nao foi possivel carregar o inventario"
    />
  );
}

function InventoryListingCard({
  item,
  onSelect,
}: {
  item: InventoryListingSummary;
  onSelect: (listingId: string) => void;
}) {
  const listing = item.listing;

  return (
    <article className="group overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)] transition-transform hover:-translate-y-0.5">
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-app-elevated">
        {item.primaryMediaUrl ? (
          <img
            alt={listing.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={item.primaryMediaUrl}
          />
        ) : (
          <Car aria-hidden="true" className="size-14 text-muted" />
        )}
        <div className="absolute left-3 top-3">
          <StatusPill status={listing.status} />
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-panel px-3 py-1 text-xs font-black text-app-text">
          {item.mediaCount} midia(s)
        </div>
      </div>

      <div className="grid gap-4 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-app-text">
            {listing.title}
          </h3>
          <p className="truncate text-sm font-bold text-muted">
            {getInventoryCatalogLine(listing.catalog, listing)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 border-y border-line py-3">
          <MetaItem
            icon={<CalendarDays aria-hidden="true" className="size-4" />}
            label="Ano"
            value={getInventoryYearLine(listing)}
          />
          <MetaItem
            icon={<KeyRound aria-hidden="true" className="size-4" />}
            label="Placa"
            value={getInventoryPlate(item)}
          />
          <MetaItem
            icon={<Image aria-hidden="true" className="size-4" />}
            label="Estoque"
            value={getInventoryStockLabel(item)}
          />
          <MetaItem
            icon={<CircleDollarSign aria-hidden="true" className="size-4" />}
            label="Preco"
            value={formatInventoryPrice(listing.priceCents)}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <IconAction
            label={`Visualizar ${listing.title}`}
            onClick={() => onSelect(listing.id)}
          >
            <Eye aria-hidden="true" className="size-4" />
          </IconAction>
          <IconAction
            label={`Editar ${listing.title}`}
            onClick={() => onSelect(listing.id)}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </IconAction>
          <IconAction
            label={`Abrir workflows de ${listing.title}`}
            onClick={() => onSelect(listing.id)}
          >
            <KeyRound aria-hidden="true" className="size-4" />
          </IconAction>
        </div>
      </div>
    </article>
  );
}

function EmptyCatalog({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-10 text-center shadow-[var(--shadow-panel)]">
      <Car aria-hidden="true" className="mx-auto mb-4 size-12 text-muted" />
      <h3 className="text-lg font-black text-app-text">{title}</h3>
      <p className="mt-2 text-sm font-bold text-muted">{body}</p>
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
    <button
      aria-label={label}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent-soft text-accent-strong transition-colors hover:bg-accent hover:text-inverse"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
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
    <div className="flex min-w-0 items-center gap-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-app text-muted">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-muted">{label}</span>
        <span className="block truncate text-sm font-black text-app-text">
          {value}
        </span>
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: InventoryListingStatus }) {
  const tone =
    status === "available"
      ? "bg-accent-soft text-accent-strong"
      : status === "reserved"
        ? "bg-warning text-app-text"
        : status === "sold"
          ? "bg-blue-soft text-app-text"
          : "bg-panel text-muted";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>
      {inventoryStatusLabels[status]}
    </span>
  );
}
