import {
  CarFront,
  Clock,
  FileArchive,
  Image as ImageIcon,
  Printer,
  Flame,
} from "lucide-react";
import {
  formatInventoryPrice,
  getInventoryCatalogLine,
  getInventoryPlate,
  getInventoryYearLine,
  getInventoryKm,
  getInventoryStockDays,
  getInventoryFipeComparison,
  getInventoryLeadsCount,
} from "../model/listCatalogModel";
import type { InventoryListingSummary } from "../model/types";
import {
  EmptyCatalog,
  StatusPill,
  MercosulPlateBadge,
} from "./InventoryListingCardGrid";

export function InventoryListingTable({
  items,
  onSelect,
  onAction,
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
  onSelect: (listingId: string) => void;
  onAction?: (
    action: "template" | "test-drive" | "zip-photos",
    item: InventoryListingSummary,
  ) => void;
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
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel/40 backdrop-blur-md shadow-sm">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-app/80 text-[10px] font-black uppercase tracking-wider text-muted border-b border-line">
          <tr>
            {visibleColumns.fotos && <th className="px-4 py-3.5">Fotos</th>}
            {visibleColumns.placa && <th className="px-4 py-3.5">Placa</th>}
            {visibleColumns.marcaModelo && (
              <th className="px-4 py-3.5">Marca/Modelo</th>
            )}
            {visibleColumns.anoKm && <th className="px-4 py-3.5">Ano/KM</th>}
            {visibleColumns.preco && <th className="px-4 py-3.5">Preço</th>}
            {visibleColumns.dias && <th className="px-4 py-3.5">Dias</th>}
            {visibleColumns.fase && <th className="px-4 py-3.5">Fase</th>}
            {visibleColumns.leads && <th className="px-4 py-3.5">Leads</th>}
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
                key={listing.id}
                onClick={() => onSelect(listing.id)}
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
                    <div className="truncate text-[10px] font-bold text-muted mt-0.5">
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
                    <div className="font-black text-accent-strong text-sm">
                      {formatInventoryPrice(listing.priceCents)}
                    </div>
                    {fipe.percentage !== 0 && (
                      <div
                        className={
                          "text-[10px] font-black mt-0.5 " +
                          (fipe.isBelow ? "text-emerald-500" : "text-amber-500")
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/20 px-2 py-0.5 text-[11px] font-black">
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
                      <StatusPill status={listing.status} />
                    </div>
                  </td>
                )}

                {/* Leads */}
                {visibleColumns.leads && (
                  <td className="px-4 py-3 whitespace-nowrap align-middle">
                    <div className="flex items-center h-10">
                      {leads > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black bg-accent-soft/30 text-accent-strong px-2 py-0.5 rounded-full border border-accent-soft/45">
                          <Flame className="size-3 text-accent animate-pulse" />
                          <span>
                            {leads} {leads === 1 ? "lead" : "leads"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted text-[11px] font-bold">
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
                    <div className="flex items-center justify-end gap-2.5 h-10">
                      {/* Action 1: Template */}
                      <div className="relative flex items-center">
                        <button
                          onClick={() => onAction?.("template", item)}
                          className="peer p-1.5 rounded-lg bg-app-elevated border border-line text-muted hover:bg-accent-soft hover:text-accent-strong transition-all cursor-pointer shadow-sm flex items-center justify-center"
                          type="button"
                          aria-label="Criar Template de Anúncio"
                        >
                          <ImageIcon className="size-3.5 text-violet-500" />
                        </button>
                        <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 hidden peer-hover:block z-30 bg-gray-900 text-white text-[9px] font-bold py-1 px-2 rounded shadow-lg whitespace-nowrap leading-none pointer-events-none border border-white/10">
                          Criar Template
                          <div className="absolute left-full top-1/2 -translate-y-1/2 border-[4px] border-transparent border-l-gray-900" />
                        </div>
                      </div>

                      {/* Action 2: Test Drive */}
                      <div className="relative flex items-center">
                        <button
                          onClick={() => onAction?.("test-drive", item)}
                          className="peer p-1.5 rounded-lg bg-app-elevated border border-line text-muted hover:bg-accent-soft hover:text-accent-strong transition-all cursor-pointer shadow-sm flex items-center justify-center"
                          type="button"
                          aria-label="Agendar Test Drive"
                        >
                          <Printer className="size-3.5 text-emerald-500" />
                        </button>
                        <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 hidden peer-hover:block z-30 bg-gray-900 text-white text-[9px] font-bold py-1 px-2 rounded shadow-lg whitespace-nowrap leading-none pointer-events-none border border-white/10">
                          Test Drive
                          <div className="absolute left-full top-1/2 -translate-y-1/2 border-[4px] border-transparent border-l-gray-900" />
                        </div>
                      </div>

                      {/* Action 3: Baixar Fotos */}
                      <div className="relative flex items-center">
                        <button
                          onClick={() => onAction?.("zip-photos", item)}
                          className="peer p-1.5 rounded-lg bg-app-elevated border border-line text-muted hover:bg-accent-soft hover:text-accent-strong transition-all cursor-pointer shadow-sm flex items-center justify-center"
                          type="button"
                          aria-label="Baixar Fotos (ZIP)"
                        >
                          <FileArchive className="size-3.5 text-pink-500" />
                        </button>
                        <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 hidden peer-hover:block z-30 bg-gray-900 text-white text-[9px] font-bold py-1 px-2 rounded shadow-lg whitespace-nowrap leading-none pointer-events-none border border-white/10">
                          Baixar Fotos (ZIP)
                          <div className="absolute left-full top-1/2 -translate-y-1/2 border-[4px] border-transparent border-l-gray-900" />
                        </div>
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
