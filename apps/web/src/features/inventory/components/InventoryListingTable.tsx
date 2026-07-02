import {
  CarFront,
  Clock,
  FileArchive,
  Image as ImageIcon,
  Printer,
} from "lucide-react";
import {
  formatInventoryPrice,
  getInventoryCatalogLine,
  getInventoryPlate,
  getInventoryYearLine,
  getInventoryDisplayStatus,
  getInventoryKm,
  getInventoryStockDays,
  getInventoryFipeComparison,
  getInventoryLeadsCount,
} from "../model/listCatalogModel";
import type { InventoryListSortKey } from "../model/inventoryListSortModel";
import type { InventoryListingSummary } from "../model/types";
import {
  EmptyCatalog,
  StatusPill,
  MercosulPlateBadge,
} from "./InventoryListingCardGrid";
import {
  FeatureRowAction,
  FeatureRowActions,
  FeatureTableFrame,
} from "../../../components/ui/FeatureTable";
import { InventoryLeadBadge } from "./InventoryLeadBadge";
import { InventorySortableHeader } from "./InventorySortableHeader";

export function InventoryListingTable({
  items,
  onSelect,
  onAction,
  onSortChange,
  sortBy,
  visibleColumns = {
    fotos: true,
    placa: true,
    marcaModelo: true,
    anoKm: true,
    preco: true,
    dias: true,
    fase: true,
    leads: true,
    acoes: true,
  },
}: {
  items: readonly InventoryListingSummary[];
  onSelect: (listingId: string, unitId?: string | null) => void;
  onAction?: (
    action: "template" | "test-drive" | "zip-photos",
    item: InventoryListingSummary,
  ) => void;
  onSortChange: (value: InventoryListSortKey) => void;
  sortBy: InventoryListSortKey;
  visibleColumns?: Record<string, boolean>;
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
    <FeatureTableFrame>
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-app/80 text-xs font-black uppercase tracking-wider text-muted border-b border-line">
          <tr>
            {visibleColumns.fotos && (
              <InventorySortableHeader
                column="fotos"
                label="Fotos"
                onSortChange={onSortChange}
                sortBy={sortBy}
              />
            )}
            {visibleColumns.placa && (
              <InventorySortableHeader
                column="placa"
                label="Placa"
                onSortChange={onSortChange}
                sortBy={sortBy}
              />
            )}
            {visibleColumns.marcaModelo && (
              <InventorySortableHeader
                column="marcaModelo"
                label="Marca/Modelo"
                onSortChange={onSortChange}
                sortBy={sortBy}
              />
            )}
            {visibleColumns.anoKm && (
              <InventorySortableHeader
                column="anoKm"
                label="Ano/KM"
                onSortChange={onSortChange}
                sortBy={sortBy}
              />
            )}
            {visibleColumns.preco && (
              <InventorySortableHeader
                column="preco"
                label="Preço"
                onSortChange={onSortChange}
                sortBy={sortBy}
              />
            )}
            {visibleColumns.dias && (
              <InventorySortableHeader
                column="dias"
                label="Dias"
                onSortChange={onSortChange}
                sortBy={sortBy}
              />
            )}
            {visibleColumns.fase && (
              <InventorySortableHeader
                column="fase"
                label="Fase"
                onSortChange={onSortChange}
                sortBy={sortBy}
              />
            )}
            {visibleColumns.leads && (
              <InventorySortableHeader
                column="leads"
                label="Leads"
                onSortChange={onSortChange}
                sortBy={sortBy}
              />
            )}
            {visibleColumns.acoes && (
              <th className="px-4 py-3.5 text-right">Ações</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/40">
          {items.map((item) => {
            const listing = item.listing;
            const plate = getInventoryPlate(item);
            const km = getInventoryKm(listing.id, listing.modelYear);
            const days = getInventoryStockDays(listing.createdAt, listing.id);
            const fipe = getInventoryFipeComparison(
              listing.priceCents,
              listing.id,
            );
            const leads = getInventoryLeadsCount(listing.id);

            return (
              <tr
                key={item.primaryUnit?.id ?? listing.id}
                onClick={() =>
                  onSelect(listing.id, item.primaryUnit?.id ?? null)
                }
                className="group cursor-pointer hover:bg-line/20 transition-all duration-150"
              >
                {/* Fotos */}
                {visibleColumns.fotos && (
                  <td className="px-4 py-3 whitespace-nowrap align-middle">
                    <div className="relative flex w-16 h-10 items-center justify-center overflow-hidden bg-app-elevated rounded-lg border border-line/40 shadow-inner">
                      {item.primaryMediaUrl ? (
                        <img
                          alt={listing.title}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          src={item.primaryMediaUrl}
                        />
                      ) : (
                        <CarFront className="size-5 text-muted/50" />
                      )}
                    </div>
                  </td>
                )}

                {/* Placa */}
                {visibleColumns.placa && (
                  <td className="px-4 py-3 whitespace-nowrap align-middle">
                    <div className="flex items-center h-10">
                      <MercosulPlateBadge plate={plate} />
                    </div>
                  </td>
                )}

                {/* Marca/Modelo */}
                {visibleColumns.marcaModelo && (
                  <td className="px-4 py-3 max-w-[220px] align-middle">
                    <div className="truncate font-black text-sm text-app-text group-hover:text-accent transition-colors">
                      {listing.title}
                    </div>
                    <div className="truncate text-xs font-bold text-muted mt-0.5">
                      {getInventoryCatalogLine(listing.catalog, listing)}
                    </div>
                  </td>
                )}

                {/* Ano/KM */}
                {visibleColumns.anoKm && (
                  <td className="px-4 py-3 whitespace-nowrap text-xs align-middle">
                    <div className="font-black text-app-text">
                      {getInventoryYearLine(listing)}
                    </div>
                    <div className="text-muted mt-0.5 font-bold">{km}</div>
                  </td>
                )}

                {/* Preço */}
                {visibleColumns.preco && (
                  <td className="px-4 py-3 whitespace-nowrap text-xs align-middle">
                    <div
                      className={
                        "font-black text-sm " +
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
                    </div>
                    {fipe.percentage !== 0 && (
                      <div
                        className={
                          "text-xs font-black mt-0.5 " +
                          (fipe.isBelow || fipe.percentage <= 3
                            ? "text-emerald-500"
                            : fipe.percentage > 10
                              ? "text-accent-strong"
                              : "text-amber-500")
                        }
                      >
                        {fipe.label}
                      </div>
                    )}
                  </td>
                )}

                {/* Dias */}
                {visibleColumns.dias && (
                  <td className="px-4 py-3 whitespace-nowrap align-middle">
                    <div className="flex items-center h-10">
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black border " +
                          (days > 30
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-panel text-muted border-line")
                        }
                      >
                        <Clock className="size-3" />
                        <span>{days}d</span>
                      </span>
                    </div>
                  </td>
                )}

                {/* Fase */}
                {visibleColumns.fase && (
                  <td className="px-4 py-3 whitespace-nowrap align-middle">
                    <div className="flex items-center h-10">
                      <StatusPill status={getInventoryDisplayStatus(item)} />
                    </div>
                  </td>
                )}

                {/* Leads */}
                {visibleColumns.leads && (
                  <td className="px-4 py-3 whitespace-nowrap align-middle">
                    <div className="flex items-center h-10">
                      {leads > 0 ? (
                        <InventoryLeadBadge leads={leads} />
                      ) : (
                        <span className="text-muted text-xs font-bold">
                          Sem leads
                        </span>
                      )}
                    </div>
                  </td>
                )}

                {/* Ações */}
                {visibleColumns.acoes && (
                  <td
                    className="px-4 py-3 whitespace-nowrap text-right align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FeatureRowActions className="gap-2.5">
                      {/* Action 1: Template */}
                      <FeatureRowAction
                        ariaLabel="Criar Template de Anúncio"
                        icon={ImageIcon}
                        iconClassName="text-violet-500"
                        onClick={() => onAction?.("template", item)}
                        tooltip="Criar Template"
                      />

                      {/* Action 2: Test Drive */}
                      <FeatureRowAction
                        ariaLabel="Agendar Test Drive"
                        icon={Printer}
                        iconClassName="text-emerald-500"
                        onClick={() => onAction?.("test-drive", item)}
                        tooltip="Test Drive"
                      />

                      {/* Action 3: Baixar Fotos */}
                      <FeatureRowAction
                        ariaLabel="Baixar Fotos (ZIP)"
                        icon={FileArchive}
                        iconClassName="text-pink-500"
                        onClick={() => onAction?.("zip-photos", item)}
                        tooltip="Baixar Fotos (ZIP)"
                      />
                    </FeatureRowActions>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </FeatureTableFrame>
  );
}
