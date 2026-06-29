"use client";

import type { StoreConfig } from "@centroimovel/types";
import { AMENITY_LABELS, PROPERTY_TYPE_LABELS } from "@centroimovel/types";
import {
  Bath,
  Bed,
  Car,
  ChevronDown,
  DollarSign,
  Home,
  MapPin,
  Ruler,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";

export interface AuroraPropertiesSidebarProps {
  config: StoreConfig;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  purpose: string;
  onPurposeChange: (v: string) => void;
  selectedType: string;
  onTypeChange: (v: string) => void;
  minPrice: string;
  onMinPriceChange: (v: string) => void;
  maxPrice: string;
  onMaxPriceChange: (v: string) => void;
  minBedrooms: string;
  onMinBedroomsChange: (v: string) => void;
  minBathrooms: string;
  onMinBathroomsChange: (v: string) => void;
  minArea: string;
  onMinAreaChange: (v: string) => void;
  minParking: string;
  onMinParkingChange: (v: string) => void;
  city: string;
  onCityChange: (v: string) => void;
  cities: string[];
  amenities: string[];
  onToggleAmenity: (amenity: string) => void;
  availableAmenities: string[];
  featuredOnly: boolean;
  onFeaturedChange: (v: boolean) => void;
  propertyTypes: string[];
  onClear: () => void;
  activeFiltersCount?: number;
  total?: number;
  onClose?: () => void;
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

export function AuroraPropertiesSidebar({
  config,
  searchTerm,
  onSearchChange,
  purpose,
  onPurposeChange,
  selectedType,
  onTypeChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  minBedrooms,
  onMinBedroomsChange,
  minBathrooms,
  onMinBathroomsChange,
  minArea,
  onMinAreaChange,
  minParking,
  onMinParkingChange,
  city,
  onCityChange,
  cities,
  amenities,
  onToggleAmenity,
  availableAmenities,
  featuredOnly,
  onFeaturedChange,
  propertyTypes,
  onClear,
  total = 0,
  onClose,
}: AuroraPropertiesSidebarProps) {
  return (
    <div className="h-full flex flex-col">
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
          onClick={onClose}
          className="h-10 w-10 rounded-full flex items-center justify-center bg-white/50 border border-white/30 hover:bg-white transition-all shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        <div className="space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-1 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Busca
          </h3>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Buscar cidade, bairro..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="relative w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-200 bg-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/30 placeholder:text-stone-400 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-1">
            Finalidade
          </h3>
          <div className="flex p-1.5 bg-stone-100 rounded-2xl w-fit shadow-inner">
            {(
              [
                ["ALL", "Todos"],
                ["ALUGUEL", "Alugar"],
                ["VENDA", "Comprar"],
              ] as [string, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onPurposeChange(val)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  purpose === val
                    ? "bg-white text-brand shadow-md"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {label}
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
                  value={minPrice}
                  onChange={(e) => onMinPriceChange(e.target.value)}
                  min={0}
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
                  placeholder="Sem limite"
                  value={maxPrice}
                  onChange={(e) => onMaxPriceChange(e.target.value)}
                  min={0}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-200 bg-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/30 transition-all shadow-sm group-hover:border-stone-300"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-1 flex items-center gap-2">
            <Home className="w-4 h-4" />
            Tipo de imóvel
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {propertyTypes.map((type) => {
              const isActive = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onTypeChange(isActive ? "ALL" : type)}
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
                  ] || type}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Bed className="w-4 h-4 opacity-50" />
            Quartos
          </h3>
          <ChipSelector
            options={CHIP_OPTIONS}
            value={minBedrooms}
            onChange={onMinBedroomsChange}
          />
        </div>

        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Car className="w-4 h-4 opacity-50" />
            Vagas de garagem
          </h3>
          <ChipSelector
            options={CHIP_OPTIONS}
            value={minParking}
            onChange={onMinParkingChange}
          />
        </div>

        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Bath className="w-4 h-4 opacity-50" />
            Banheiros
          </h3>
          <ChipSelector
            options={CHIP_OPTIONS}
            value={minBathrooms}
            onChange={onMinBathroomsChange}
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
                  value={minArea}
                  onChange={(e) => onMinAreaChange(e.target.value)}
                  min={0}
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
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-1 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Cidade
            </h3>
            <div className="relative">
              <select
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              >
                <option value="ALL">Todas as cidades</option>
                {cities.map((c) => (
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
                const isActive = amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => onToggleAmenity(a)}
                    className={`px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                      isActive
                        ? "bg-stone-800 text-white border-stone-800 shadow-md"
                        : "bg-white text-stone-400 border-stone-200 hover:border-stone-300 hover:text-stone-600"
                    }`}
                  >
                    {AMENITY_LABELS[a as keyof typeof AMENITY_LABELS] || a}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => onFeaturedChange(!featuredOnly)}
            className={`w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
              featuredOnly
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-foreground/70 hover:border-foreground/20"
            }`}
          >
            <Star className="w-4 h-4" />
            Apenas destaques
          </button>
        </div>
      </div>

      <div className="px-8 py-6 border-t border-white/20 flex items-center justify-between gap-4 bg-white/50 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-black uppercase tracking-widest text-foreground/40 hover:text-brand transition-colors"
        >
          Limpar tudo
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-4 rounded-2xl bg-brand text-white text-sm font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand/20"
        >
          Ver {total.toLocaleString("pt-BR")} imóveis
        </button>
      </div>
    </div>
  );
}
