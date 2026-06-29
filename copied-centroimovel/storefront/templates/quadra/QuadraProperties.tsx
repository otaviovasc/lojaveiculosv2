"use client";

import { getPropertyUrl } from "@/lib/property-slug";
import { cn, formatBRL } from "@/lib/utils";
import { trackEvent } from "@/modules/storefront/lib/tracker";
import { usePropertyFilters } from "@/modules/storefront/lib/usePropertyFilters";
import type { StoreConfig } from "@centroimovel/types";
import { AMENITY_LABELS, PROPERTY_TYPE_LABELS } from "@centroimovel/types";
import {
  Bath,
  Bed,
  Car,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Home,
  LayoutGrid,
  List,
  MapPin,
  Ruler,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AuroraWhatsAppButton as WhatsAppButton } from "../aurora/AuroraWhatsAppButton";
import type { TemplateProperty } from "../registry";
import { QuadraFooter } from "./QuadraFooter";
import { QuadraHeader } from "./QuadraHeader";

type SortBy = "relevance" | "price_asc" | "price_desc" | "area_desc";
type ViewMode = "grid" | "list";

interface TemplateProps {
  config: StoreConfig;
  properties: TemplateProperty[];
  slug: string;
  workspaceId: string;
  searchParams?: Record<string, string | string[] | undefined>;
}

const CHIP_OPTIONS = [
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];

function ChipSelector({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onChange("")}
        className={`rounded-xl px-4 py-2.5 text-xs font-bold border transition-all ${
          !value
            ? "bg-brand text-white border-brand shadow-md shadow-brand/10"
            : "bg-stone-100 text-stone-500 border-transparent hover:bg-stone-200 hover:text-stone-700"
        }`}
      >
        Tanto faz
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-xl px-4 py-2.5 text-xs font-bold border transition-all ${
            value === opt.value
              ? "bg-brand text-white border-brand shadow-md shadow-brand/10"
              : "bg-stone-100 text-stone-500 border-transparent hover:bg-stone-200 hover:text-stone-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function QuadraProperties({
  config,
  properties,
  slug,
  workspaceId,
}: TemplateProps) {
  const [sortBy, setSortBy] = useState<SortBy>("relevance");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
      case "price_asc":
        return arr.sort((a, b) => {
          const pa =
            (a.purpose === "ALUGUEL" ? (a.rentPrice ?? a.price) : a.price) ?? 0;
          const pb =
            (b.purpose === "ALUGUEL" ? (b.rentPrice ?? b.price) : b.price) ?? 0;
          return pa - pb;
        });
      case "price_desc":
        return arr.sort((a, b) => {
          const pa =
            (a.purpose === "ALUGUEL" ? (a.rentPrice ?? a.price) : a.price) ?? 0;
          const pb =
            (b.purpose === "ALUGUEL" ? (b.rentPrice ?? b.price) : b.price) ?? 0;
          return pb - pa;
        });
      case "area_desc":
        return arr.sort((a, b) => (b.areaM2 ?? 0) - (a.areaM2 ?? 0));
      default:
        return arr.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
  }, [filteredProperties, sortBy]);

  const activeChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (state.searchTerm)
      chips.push({
        label: `"${state.searchTerm}"`,
        onRemove: () => updateState({ searchTerm: "" }),
      });
    if (state.purpose !== "ALL")
      chips.push({
        label: state.purpose === "VENDA" ? "Venda" : "Aluguel",
        onRemove: () => updateState({ purpose: "ALL" }),
      });
    if (state.selectedType !== "ALL")
      chips.push({
        label:
          PROPERTY_TYPE_LABELS[
            state.selectedType as keyof typeof PROPERTY_TYPE_LABELS
          ] ?? state.selectedType,
        onRemove: () => updateState({ selectedType: "ALL" }),
      });
    if (state.minPrice)
      chips.push({
        label: `Min ${formatBRL(Number(state.minPrice))}`,
        onRemove: () => updateState({ minPrice: "" }),
      });
    if (state.maxPrice)
      chips.push({
        label: `Máx ${formatBRL(Number(state.maxPrice))}`,
        onRemove: () => updateState({ maxPrice: "" }),
      });
    if (state.minBedrooms)
      chips.push({
        label: `${state.minBedrooms}+ quartos`,
        onRemove: () => updateState({ minBedrooms: "" }),
      });
    if (state.minBathrooms)
      chips.push({
        label: `${state.minBathrooms}+ banheiros`,
        onRemove: () => updateState({ minBathrooms: "" }),
      });
    if (state.minParking)
      chips.push({
        label: `${state.minParking}+ vagas`,
        onRemove: () => updateState({ minParking: "" }),
      });
    if (state.minArea)
      chips.push({
        label: `${state.minArea}+ m²`,
        onRemove: () => updateState({ minArea: "" }),
      });
    if (state.city !== "ALL")
      chips.push({
        label: state.city,
        onRemove: () => updateState({ city: "ALL" }),
      });
    state.amenities.forEach((a) =>
      chips.push({ label: a, onRemove: () => toggleAmenity(a) }),
    );
    if (state.featuredOnly)
      chips.push({
        label: "Destaques",
        onRemove: () => updateState({ featuredOnly: false }),
      });
    return chips;
  }, [state, updateState, toggleAmenity]);

  const gridClass =
    viewMode === "grid"
      ? "grid gap-7 sm:grid-cols-2 xl:grid-cols-3"
      : "flex flex-col gap-8";

  return (
    <div className="min-h-screen bg-background pt-20 md:pt-16">
      <QuadraHeader
        config={config}
        slug={slug}
        hasHero={false}
        isPropertiesPage
      />

      <div className="sticky top-20 md:top-16 z-70">
        <div className="relative z-10 bg-stone-50 border-b border-stone-200/60 transition-all duration-300">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 relative z-10">
            <div className="flex items-center gap-2.5 py-2.5 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
              <div className="relative shrink-0 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none z-10 group-focus-within:text-brand transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar cidade, bairro..."
                  value={state.searchTerm}
                  onChange={(e) => updateState({ searchTerm: e.target.value })}
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
                    className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 ${
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
                  <span className="flex items-center justify-center h-4.5 min-w-[18px] rounded-full bg-brand text-white text-[9px] font-black px-1.5 shadow-sm ml-0.5">
                    {activeChips.length}
                  </span>
                )}
              </button>
            </div>

            {activeChips.length > 0 && (
              <div className="flex items-center gap-2 pb-4 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 shrink-0 mr-1">
                  Ativos:
                </span>
                {activeChips.map((chip, i) => (
                  <button
                    key={i}
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
                  <option value="relevance">Mais relevantes</option>
                  <option value="price_asc">Menor preço</option>
                  <option value="price_desc">Maior preço</option>
                  <option value="area_desc">Maior área</option>
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-40 text-foreground group-hover:opacity-100 transition-opacity"
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-full border border-white/40 bg-white/60 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded-full p-2 transition-all duration-300",
                    viewMode === "grid"
                      ? "bg-foreground text-background shadow-md scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/50",
                  )}
                  aria-label="Grade"
                >
                  <LayoutGrid size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "rounded-full p-2 transition-all duration-300",
                    viewMode === "list"
                      ? "bg-foreground text-background shadow-md scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/50",
                  )}
                  aria-label="Lista"
                >
                  <List size={16} strokeWidth={2.5} />
                </button>
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
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">
                  Mais filtros
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-white/50 border border-white/30 hover:bg-white transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-1">
                  Finalidade
                </h3>
                <div className="flex p-1.5 bg-stone-100 rounded-2xl w-fit shadow-inner">
                  {[
                    { value: "ALUGUEL", label: "Alugar" },
                    { value: "VENDA", label: "Comprar" },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => updateState({ purpose: p.value })}
                      className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                        state.purpose === p.value
                          ? "bg-white text-brand shadow-md"
                          : "text-stone-400 hover:text-stone-600"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-1 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Faixa de Preço
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">
                      Mínimo
                    </label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">
                        R$
                      </span>
                      <input
                        type="number"
                        placeholder="0"
                        value={state.minPrice}
                        onChange={(e) =>
                          updateState({ minPrice: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-200 bg-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/30 transition-all shadow-sm group-hover:border-stone-300"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">
                      Máximo
                    </label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">
                        R$
                      </span>
                      <input
                        type="number"
                        placeholder="10M+"
                        value={state.maxPrice}
                        onChange={(e) =>
                          updateState({ maxPrice: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-200 bg-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/30 transition-all shadow-sm group-hover:border-stone-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {propertyTypes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-1 flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Tipo de imóvel
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {propertyTypes.map((type) => {
                      const isActive = state.selectedType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            updateState({
                              selectedType: isActive ? "ALL" : type,
                            })
                          }
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold transition-all ${
                            isActive
                              ? "border-brand bg-brand text-white shadow-lg shadow-brand/20"
                              : "border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-800 shadow-sm"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                              isActive
                                ? "border-white bg-transparent"
                                : "border-stone-200"
                            }`}
                          >
                            {isActive && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          {PROPERTY_TYPE_LABELS[
                            type as keyof typeof PROPERTY_TYPE_LABELS
                          ] ?? type}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Bed className="w-4 h-4 opacity-50" />
                  Quartos
                </h3>
                <ChipSelector
                  options={CHIP_OPTIONS}
                  value={state.minBedrooms}
                  onChange={(v) => updateState({ minBedrooms: v })}
                />
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4 opacity-50" />
                  Vagas de garagem
                </h3>
                <ChipSelector
                  options={CHIP_OPTIONS}
                  value={state.minParking}
                  onChange={(v) => updateState({ minParking: v })}
                />
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Bath className="w-4 h-4 opacity-50" />
                  Banheiros
                </h3>
                <ChipSelector
                  options={CHIP_OPTIONS}
                  value={state.minBathrooms}
                  onChange={(v) => updateState({ minBathrooms: v })}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-1 flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Área
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">
                      Mínima
                    </label>
                    <div className="relative group">
                      <input
                        type="number"
                        placeholder="0"
                        value={state.minArea}
                        onChange={(e) =>
                          updateState({ minArea: e.target.value })
                        }
                        className="w-full px-4 pr-12 py-3 rounded-2xl border border-stone-200 bg-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/30 transition-all shadow-sm group-hover:border-stone-300"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">
                        m²
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {cities.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 opacity-50" />
                    Localização
                  </h3>
                  <div className="relative">
                    <select
                      value={state.city ?? "ALL"}
                      onChange={(e) => updateState({ city: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                    >
                      <option value="ALL">Todas as cidades</option>
                      {cities
                        .filter((c): c is string => c != null)
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              )}

              {availableAmenities.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Comodidades
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {availableAmenities.map((a) => {
                      const isActive = state.amenities.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleAmenity(a)}
                          className={`px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                            isActive
                              ? "bg-stone-800 text-white border-stone-800 shadow-md"
                              : "bg-white text-stone-400 border-stone-200 hover:border-stone-300 hover:text-stone-600"
                          }`}
                        >
                          {AMENITY_LABELS[a as keyof typeof AMENITY_LABELS] ||
                            a}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={state.featuredOnly}
                    onChange={(e) =>
                      updateState({ featuredOnly: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-border text-brand focus:ring-brand"
                  />
                  <span className="text-sm font-bold text-foreground/70 group-hover:text-foreground transition-colors">
                    Apenas Destaques
                  </span>
                </label>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-white/20 flex items-center justify-between gap-4 bg-white/50 backdrop-blur-xl">
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-black uppercase tracking-widest text-foreground/40 hover:text-brand transition-colors"
              >
                Limpar tudo
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="flex-1 py-4 rounded-2xl bg-brand text-white text-sm font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand/20"
              >
                Ver {sortedProperties.length.toLocaleString("pt-BR")} imóveis
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-[1600px] mx-auto w-full">
          {sortedProperties.length > 0 ? (
            <div className={gridClass}>
              {sortedProperties.map((p) => (
                <QuadraPropertyCard
                  key={p.id}
                  property={p}
                  config={config}
                  slug={slug}
                  workspaceId={workspaceId}
                  variant={viewMode === "list" ? "list" : "grid"}
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

      <WhatsAppButton config={config} />
      <QuadraFooter config={config} slug={slug} />
    </div>
  );
}

function QuadraPropertyCard({
  property,
  config,
  slug,
  workspaceId,
  variant = "grid",
}: {
  property: TemplateProperty;
  config: StoreConfig;
  slug: string;
  workspaceId: string;
  variant?: "grid" | "list";
}) {
  const isList = variant === "list";

  const handleCardClick = () => {
    trackEvent("click", workspaceId, {
      resourceId: property.id,
      metadata: {
        sourceType: isList ? "storefront_listing" : "storefront_grid",
        interactionType: "property_card_click",
      },
    });
  };

  const getDisplayPrice = () => {
    if (property.hidePrice) return null;

    if (property.purpose === "AMBOS") {
      return {
        hasBoth: true,
        salePrice: property.price,
        rentPrice: property.rentPrice,
      };
    }

    if (property.purpose === "ALUGUEL") {
      return {
        price: property.rentPrice ?? property.price,
        label: "Aluguel",
        isRent: true,
      };
    }

    return { price: property.price, label: "Investimento" };
  };

  const priceInfo = getDisplayPrice();

  const purposeLabel =
    property.purpose === "VENDA"
      ? "Venda"
      : property.purpose === "ALUGUEL"
        ? "Locação"
        : "Venda/Aluguel";

  const propertyUrl = getPropertyUrl(slug, property);
  const workspaceDisplayName = config.corretorName || slug;

  return (
    <Link
      href={propertyUrl}
      onClick={handleCardClick}
      className={cn(
        "group relative flex overflow-hidden rounded-[2rem] bg-card/60 backdrop-blur-md border border-border/50 hover:border-brand/40 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500",
        isList ? "flex-col md:flex-row h-auto md:h-72" : "flex-col h-full",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-muted/30 shrink-0",
          isList
            ? "w-full md:w-[320px] aspect-4/3 md:aspect-auto"
            : "aspect-4/3",
        )}
      >
        {property.coverPhotoUrl ? (
          <Image
            src={property.coverPhotoUrl}
            alt={property.title}
            fill
            sizes={
              isList
                ? "(max-width: 768px) 100vw, 320px"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            }
            className="object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
            priority={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sem foto
          </div>
        )}

        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-xl border border-white/30 text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            {purposeLabel}
          </span>
          {property.featured && (
            <span
              className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-lg"
              style={{
                backgroundColor: config.accentColor,
                boxShadow: `0 4px 12px ${config.accentColor}40`,
              }}
            >
              Destaque
            </span>
          )}
        </div>

        {!isList && (
          <div className="absolute bottom-4 right-4 z-10">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-black/40 backdrop-blur-xl border border-white/10 text-white">
              {workspaceDisplayName}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-60" />
      </div>

      <div className="flex-1 p-6 flex flex-col min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          <MapPin className="w-3 h-3 text-brand" />
          <span className="truncate">
            {[property.neighborhood, property.city].filter(Boolean).join(" · ")}
          </span>
        </div>

        <h3
          className={cn(
            "font-bold text-foreground transition-colors duration-300",
            isList
              ? "text-xl md:text-2xl line-clamp-1 mb-2 group-hover:text-brand"
              : "text-lg line-clamp-2 mb-4 group-hover:text-brand",
          )}
        >
          {property.title}
        </h3>

        {isList && (
          <p className="hidden md:block text-sm text-muted-foreground/70 line-clamp-2 mb-4 max-w-2xl">
            Consulte mais detalhes sobre este excelente imóvel e agende sua
            visita hoje mesmo.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-4">
          {property.bedrooms != null && (
            <span className="inline-flex items-center gap-1.5">
              <Bed className="w-4 h-4" />
              {property.bedrooms}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="inline-flex items-center gap-1.5">
              <Bath className="w-4 h-4" />
              {property.bathrooms}
            </span>
          )}
          {property.parkingSpots != null && property.parkingSpots > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Car className="w-4 h-4" />
              {property.parkingSpots}
            </span>
          )}
          {property.areaM2 != null && (
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="w-4 h-4" />
              {property.areaM2} m²
            </span>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
          <div className="flex flex-col">
            {property.hidePrice ? (
              <p className="text-sm font-medium text-muted-foreground">
                Preço sob consulta
              </p>
            ) : priceInfo?.hasBoth ? (
              <div className="flex flex-col md:flex-row md:items-center gap-x-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50 mb-0.5">
                    Venda
                  </p>
                  <p className="text-xl font-bold text-brand">
                    {formatBRL(priceInfo.salePrice)}
                  </p>
                </div>
                {priceInfo.rentPrice && (
                  <div className="mt-1 md:mt-0">
                    <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50 mb-0.5">
                      Aluguel
                    </p>
                    <p className="text-base font-bold text-foreground">
                      {formatBRL(priceInfo.rentPrice)}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        /mês
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ) : priceInfo?.price ? (
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50 mb-0.5">
                  {priceInfo.isRent ? "Aluguel" : "Investimento"}
                </p>
                <p className="text-xl font-bold text-brand">
                  {formatBRL(priceInfo.price)}
                  {priceInfo.isRent && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      /mês
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">
                Preço sob consulta
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isList && (
              <div className="hidden lg:flex flex-col items-end text-right">
                <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/40">
                  Anunciante
                </p>
                <p className="text-xs font-bold text-foreground/70">
                  {workspaceDisplayName}
                </p>
              </div>
            )}
            <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center group-hover:bg-brand group-hover:rotate-12 transition-all duration-500 shadow-glow-sm">
              <ChevronRight className="w-5 h-5 text-brand group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
