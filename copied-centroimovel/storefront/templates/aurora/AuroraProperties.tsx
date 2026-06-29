"use client";

import { formatBRL } from "@/lib/utils";
import { usePropertyFilters } from "@/modules/storefront/lib/usePropertyFilters";
import type { StoreConfig } from "@centroimovel/types";
import { PROPERTY_TYPE_LABELS } from "@centroimovel/types";
import {
  ChevronDown,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { TemplateProperty } from "../registry";
import { AuroraPropertyCard } from "./AuroraFeatured";
import { AuroraFooter } from "./AuroraFooter";
import { AuroraHeader } from "./AuroraHeader";
import { AuroraPropertiesSidebar } from "./AuroraPropertiesSidebar";
import { AuroraWhatsAppButton } from "./AuroraWhatsAppButton";

interface TemplateProps {
  config: StoreConfig;
  properties: TemplateProperty[];
  slug: string;
  workspaceId: string;
  searchParams?: Record<string, string | string[] | undefined>;
}

type SortBy = "NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "AREA_DESC";
type ViewMode = "GRID" | "LIST";

export default function AuroraProperties({
  config,
  properties,
  slug,
  workspaceId,
}: TemplateProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("NEWEST");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");

  const {
    state,
    updateState,
    filteredProperties,
    propertyTypes,
    cities,
    clearFilters,
    toggleAmenity,
    availableAmenities,
  } = usePropertyFilters(properties, workspaceId);

  const sortedProperties = useMemo(() => {
    const arr = [...filteredProperties];
    switch (sortBy) {
      case "PRICE_ASC":
        return arr.sort((a, b) => {
          const pa =
            (a.purpose === "ALUGUEL" ? (a.rentPrice ?? a.price) : a.price) ?? 0;
          const pb =
            (b.purpose === "ALUGUEL" ? (b.rentPrice ?? b.price) : b.price) ?? 0;
          return pa - pb;
        });
      case "PRICE_DESC":
        return arr.sort((a, b) => {
          const pa =
            (a.purpose === "ALUGUEL" ? (a.rentPrice ?? a.price) : a.price) ?? 0;
          const pb =
            (b.purpose === "ALUGUEL" ? (b.rentPrice ?? b.price) : b.price) ?? 0;
          return pb - pa;
        });
      case "AREA_DESC":
        return arr.sort((a, b) => (b.areaM2 ?? 0) - (a.areaM2 ?? 0));
      default:
        return arr.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
  }, [filteredProperties, sortBy]);

  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = [];
    if (state.searchTerm)
      chips.push({
        id: "search",
        label: `"${state.searchTerm}"`,
        onRemove: () => updateState({ searchTerm: "" }),
      });
    if (state.purpose !== "ALL")
      chips.push({
        id: "purpose",
        label: state.purpose === "VENDA" ? "Venda" : "Aluguel",
        onRemove: () => updateState({ purpose: "ALL" }),
      });
    if (state.selectedType !== "ALL")
      chips.push({
        id: "type",
        label:
          PROPERTY_TYPE_LABELS[
            state.selectedType as keyof typeof PROPERTY_TYPE_LABELS
          ] ?? state.selectedType,
        onRemove: () => updateState({ selectedType: "ALL" }),
      });
    if (state.minPrice)
      chips.push({
        id: "minPrice",
        label: `Mín ${formatBRL(Number(state.minPrice))}`,
        onRemove: () => updateState({ minPrice: "" }),
      });
    if (state.maxPrice)
      chips.push({
        id: "maxPrice",
        label: `Máx ${formatBRL(Number(state.maxPrice))}`,
        onRemove: () => updateState({ maxPrice: "" }),
      });
    if (state.minBedrooms)
      chips.push({
        id: "beds",
        label: `${state.minBedrooms}+ Q`,
        onRemove: () => updateState({ minBedrooms: "" }),
      });
    if (state.city !== "ALL")
      chips.push({
        id: "city",
        label: state.city,
        onRemove: () => updateState({ city: "ALL" }),
      });
    state.amenities.forEach((a) =>
      chips.push({
        id: `amenity-${a}`,
        label: a,
        onRemove: () => toggleAmenity(a),
      }),
    );
    if (state.featuredOnly)
      chips.push({
        id: "featured",
        label: "Destaques",
        onRemove: () => updateState({ featuredOnly: false }),
      });
    return chips;
  }, [state, updateState, toggleAmenity]);

  const gridClass =
    viewMode === "GRID"
      ? "grid gap-7 sm:grid-cols-2 xl:grid-cols-3"
      : "flex flex-col gap-8";

  return (
    <div
      className="min-h-screen flex flex-col bg-background pt-20 md:pt-16 font-body"
      style={{ backgroundColor: config.backgroundColor }}
    >
      <AuroraHeader config={config} slug={slug} isPropertiesPage />

      <main className="flex-1 flex flex-col w-full font-body">
        <div className="sticky top-20 md:top-16 z-70">
          <div className="bg-stone-50 border-b border-stone-200/60">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10">
              <div className="flex items-center gap-2.5 py-2.5 overflow-x-auto scrollbar-none">
                <div className="relative shrink-0 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none z-10 group-focus-within:text-brand transition-colors" />
                  <input
                    type="text"
                    placeholder="Buscar cidade, bairro..."
                    value={state.searchTerm}
                    onChange={(e) =>
                      updateState({ searchTerm: e.target.value })
                    }
                    className="relative pl-10 pr-4 py-2 rounded-full border border-stone-200 bg-white text-[12px] font-bold w-[200px] md:w-[280px] focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand/30 placeholder:text-stone-400 transition-all shadow-sm"
                  />
                </div>

                <div className="h-6 w-px bg-stone-200 mx-1 shrink-0" />

                <div className="flex p-1 bg-stone-200/50 rounded-full shrink-0">
                  {[
                    { value: "ALUGUEL", label: "Alugar" },
                    { value: "VENDA", label: "Comprar" },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => updateState({ purpose: p.value })}
                      className={`px-4 py-[5px] rounded-full text-[11px] font-bold transition-all duration-300 ${
                        state.purpose === p.value
                          ? "bg-white text-brand shadow-sm"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest bg-stone-800 text-white hover:bg-stone-900 active:scale-95 transition-all shadow-sm shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={3} />
                  Filtros
                  {activeChips.length > 0 && (
                    <span className="flex items-center justify-center h-4.5 min-w-[18px] rounded-full bg-brand text-white text-[9px] font-black px-1.25 shadow-sm ml-0.5">
                      {activeChips.length}
                    </span>
                  )}
                </button>
              </div>

              {activeChips.length > 0 && (
                <div className="flex items-center gap-2 pb-4 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 shrink-0 mr-1">
                    Ativos:
                  </span>
                  {activeChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => chip.onRemove()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-[11px] font-bold hover:bg-brand hover:text-white transition-all shadow-sm shrink-0 group"
                    >
                      {chip.label}
                      <X className="w-3 h-3 ml-0.5 opacity-50 group-hover:opacity-100" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-brand transition-colors shrink-0 ml-2"
                  >
                    Limpar tudo
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 md:px-8 lg:px-10 py-3 border-b border-border/40 bg-white relative z-30 shadow-sm">
            <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  Imóveis para Venda e Aluguel
                </h1>
                <p className="text-[11px] font-bold text-muted-foreground/50 flex items-center gap-2">
                  {sortedProperties.length.toLocaleString("pt-BR")} exclusivos
                  encontrados
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative inline-flex items-center group">
                  <div className="absolute inset-0 bg-brand/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="relative appearance-none rounded-full border border-white/40 bg-white/60 pl-5 pr-10 py-2.5 text-[13px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand/30 transition-all cursor-pointer text-foreground shadow-sm"
                    aria-label="Ordenar imóveis"
                  >
                    <option value="NEWEST">Recentes</option>
                    <option value="PRICE_ASC">Menor Preço</option>
                    <option value="PRICE_DESC">Maior Preço</option>
                    <option value="AREA_DESC">Maior Área</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-40 text-foreground group-hover:opacity-100 transition-opacity"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 rounded-full border border-white/40 bg-white/60 shadow-sm">
                  {(["GRID", "LIST"] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`rounded-full p-2 transition-all duration-300 ${
                        viewMode === mode
                          ? "bg-foreground text-background shadow-md scale-105"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                      }`}
                      aria-label={mode === "GRID" ? "Grade" : "Lista"}
                    >
                      {mode === "LIST" ? (
                        <List size={16} strokeWidth={2.5} />
                      ) : (
                        <LayoutGrid size={16} strokeWidth={2.5} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {filtersOpen && (
          <div className="fixed inset-0 z-100 flex">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
              onClick={() => setFiltersOpen(false)}
            />
            <div className="relative ml-auto w-full max-w-md h-full bg-white/90 backdrop-blur-2xl shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-white/20">
              <AuroraPropertiesSidebar
                config={config}
                searchTerm={state.searchTerm}
                onSearchChange={(v) => updateState({ searchTerm: v })}
                purpose={state.purpose}
                onPurposeChange={(v) => updateState({ purpose: v })}
                selectedType={state.selectedType}
                onTypeChange={(v) => updateState({ selectedType: v })}
                minPrice={state.minPrice}
                onMinPriceChange={(v) => updateState({ minPrice: v })}
                maxPrice={state.maxPrice}
                onMaxPriceChange={(v) => updateState({ maxPrice: v })}
                minBedrooms={state.minBedrooms}
                onMinBedroomsChange={(v) => updateState({ minBedrooms: v })}
                minBathrooms={state.minBathrooms}
                onMinBathroomsChange={(v) => updateState({ minBathrooms: v })}
                minArea={state.minArea}
                onMinAreaChange={(v) => updateState({ minArea: v })}
                minParking={state.minParking}
                onMinParkingChange={(v) => updateState({ minParking: v })}
                city={state.city}
                onCityChange={(v) => updateState({ city: v })}
                cities={cities.filter((c): c is string => c !== null)}
                amenities={state.amenities}
                onToggleAmenity={toggleAmenity}
                availableAmenities={availableAmenities}
                featuredOnly={state.featuredOnly}
                onFeaturedChange={(v) => updateState({ featuredOnly: v })}
                propertyTypes={propertyTypes}
                onClear={clearFilters}
                activeFiltersCount={activeChips.length}
                total={sortedProperties.length}
                onClose={() => setFiltersOpen(false)}
              />
            </div>
          </div>
        )}

        <div className="px-4 md:px-8 lg:px-10 py-6">
          <div className="max-w-[1600px] mx-auto w-full">
            {sortedProperties.length > 0 ? (
              <div className={gridClass}>
                {sortedProperties.map((p) => (
                  <AuroraPropertyCard
                    key={p.id}
                    property={p}
                    config={config}
                    slug={slug}
                    workspaceId={workspaceId}
                    variant={viewMode === "LIST" ? "list" : "grid"}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center max-w-md mx-auto rounded-3xl border-2 border-dashed border-border">
                <Search size={48} className="mb-5 opacity-20 text-foreground" />
                <p className="text-xl font-semibold mb-2 text-foreground">
                  Nenhum imóvel encontrado
                </p>
                <p className="text-sm mb-6 text-muted-foreground">
                  Tente ajustar os filtros ou faça uma nova busca.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 bg-brand text-white font-bold transition-all hover:bg-brand/90"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <AuroraWhatsAppButton config={config} />
      <AuroraFooter config={config} slug={slug} />
    </div>
  );
}
