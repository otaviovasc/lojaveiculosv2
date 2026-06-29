"use client";

import { getPropertyUrl } from "@/lib/property-slug";
import { formatArea, formatBRL } from "@/lib/utils";
import { StorefrontLink } from "@/modules/storefront/lib/utm-navigation";
import type { StoreConfig } from "@centroimovel/types";
import {
  ArrowRight,
  Bath,
  Bed,
  Car,
  Heart,
  MapPin,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import type { TemplateProperty } from "../registry";

// ─────────────────────────────────────────────────────────────────────────────
// Favorites hook (localStorage, per workspace slug)
// ─────────────────────────────────────────────────────────────────────────────
export function useFavorites(slug: string) {
  const key = `foco_favorites_${slug}`;

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(key);
      return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggle = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        try {
          localStorage.setItem(key, JSON.stringify([...next]));
        } catch {}
        return next;
      });
    },
    [key],
  );

  return { favorites, toggle };
}

import { AnimatedDiv } from "@/components/ui/animated-div";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/modules/storefront/lib/tracker";
import Image from "next/image";

interface AuroraFeaturedProps {
  config: StoreConfig;
  slug: string;
  properties: TemplateProperty[];
  sectionId?: string;
  title?: string;
  subtitle?: string;
  showAllLink?: boolean;
}

export function AuroraFeatured({
  config,
  slug,
  properties,
  sectionId = "featured",
  title = "Propriedades em Destaque",
  subtitle = "Seleção Exclusiva",
  showAllLink = true,
}: AuroraFeaturedProps) {
  if (properties.length === 0) return null;

  return (
    <section
      id={sectionId}
      className="px-6 py-24 md:py-40 md:px-12 max-w-[1600px] mx-auto font-body"
    >
      <div className="mb-20 flex flex-col md:flex-row items-end justify-between gap-10">
        <AnimatedDiv className="max-w-3xl text-left">
          <span
            className="text-[10px] font-black tracking-[0.4em] uppercase mb-6 block"
            style={{ color: config.accentColor }}
          >
            {subtitle}
          </span>
          <h2
            className="text-3xl md:text-6xl font-black leading-[0.95] uppercase font-display"
            style={{
              color: config.brandColor,
            }}
          >
            {title}
          </h2>
        </AnimatedDiv>
        {showAllLink && (
          <AnimatedDiv delay={0.2}>
            <StorefrontLink
              href={`/${slug}/imoveis`}
              className="group flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-70 transition-all"
              style={{ color: config.brandColor }}
            >
              Ver Coleção Completa
              <div
                className="w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-45"
                style={{ borderColor: `${config.brandColor}33` }}
              >
                <ArrowRight size={18} />
              </div>
            </StorefrontLink>
          </AnimatedDiv>
        )}
      </div>

      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p, i) => (
          <AnimatedDiv
            key={p.id}
            transition={{ delay: i * 0.1, duration: 0.6 }}
          >
            <AuroraPropertyCard property={p} config={config} slug={slug} />
          </AnimatedDiv>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Property Card — Aurora style
// ─────────────────────────────────────────────────────────────────────────────
export function AuroraPropertyCard({
  property,
  config,
  slug,
  favorites,
  onToggleFavorite,
  workspaceId,
  variant = "grid",
}: {
  property: TemplateProperty;
  config: StoreConfig;
  slug: string;
  favorites?: Set<string>;
  onToggleFavorite?: (id: string) => void;
  workspaceId?: string;
  variant?: "grid" | "list";
}) {
  const isFav = favorites?.has(property.id) ?? false;
  const isList = variant === "list";

  const handleCardClick = () => {
    if (!workspaceId) return;
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
            ? "w-full md:w-[320px] aspect-[4/3] md:aspect-auto"
            : "aspect-[4/3]",
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
          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-black uppercase tracking-widest text-[10px]">
            Imóvel Exclusivo
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

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(property.id);
          }}
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none"
          aria-label={
            isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"
          }
        >
          <Heart
            size={18}
            className="transition-all duration-300"
            style={
              isFav
                ? { fill: "#ef4444", stroke: "#ef4444" }
                : { stroke: "#fff" }
            }
          />
        </button>
      )}

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
              <SlidersHorizontal className="w-4 h-4 rotate-90" />
              {formatArea(property.areaM2)}
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
              <ArrowRight className="w-5 h-5 text-brand group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
