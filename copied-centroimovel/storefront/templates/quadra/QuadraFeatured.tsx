"use client";

import { getPropertyUrl } from "@/lib/property-slug";
import { formatArea, formatBRL } from "@/lib/utils";
import { StorefrontLink } from "@/modules/storefront/lib/utm-navigation";
import type { StoreConfig } from "@centroimovel/types";
import { ArrowUpRight, Bed, MapPin, SlidersHorizontal } from "lucide-react";
import type { TemplateProperty } from "../registry";

import { AnimatedDiv } from "@/components/ui/animated-div";

interface QuadraFeaturedProps {
  config: StoreConfig;
  slug: string;
  properties: TemplateProperty[];
  sectionId?: string;
  title?: string;
  accentWord?: string;
  showAllLink?: boolean;
}

export function QuadraFeatured({
  config,
  slug,
  properties,
  sectionId = "featured",
  title = "Minha seleção",
  accentWord = "especial",
  showAllLink = true,
}: QuadraFeaturedProps) {
  if (properties.length === 0) return null;

  return (
    <section id={sectionId} className="py-24 md:py-32 bg-stone-50/60 font-body">
      <div className="max-w-[1400px] mx-auto px-8">
        <div className="mb-16">
          <AnimatedDiv
            className="h-[5px] w-24 mb-6"
            style={{ backgroundColor: config.accentColor }}
          />
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <AnimatedDiv delay={0.1}>
              <h2
                className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic font-display"
                style={{
                  color: config.brandColor,
                }}
              >
                {title}{" "}
                <span style={{ color: config.accentColor }}>{accentWord}</span>
              </h2>
            </AnimatedDiv>
            {showAllLink && (
              <AnimatedDiv delay={0.2}>
                <StorefrontLink
                  href={`/${slug}/imoveis`}
                  className="group flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.25em] transition-all hover:opacity-70"
                  style={{ color: config.brandColor }}
                >
                  Explorar Todo o Portfólio
                  <div
                    className="w-12 h-12 rounded-sm border-2 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-black group-hover:text-white"
                    style={{ borderColor: config.brandColor }}
                  >
                    <ArrowUpRight size={20} strokeWidth={3} />
                  </div>
                </StorefrontLink>
              </AnimatedDiv>
            )}
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property, i) => (
            <AnimatedDiv
              key={property.id}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <a
                href={getPropertyUrl(slug, property)}
                className="group block overflow-hidden rounded-[2rem] bg-white/70 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-stone-100 hover:border-brand/40 focus:outline-none"
              >
                <div className="relative aspect-4/3 overflow-hidden bg-stone-100">
                  {property.coverPhotoUrl ? (
                    <img
                      src={property.coverPhotoUrl}
                      alt={property.title}
                      className="h-full w-full object-cover object-center transition-transform duration-[2s] group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-stone-300">
                      <MapPin
                        size={48}
                        strokeWidth={1}
                        className="opacity-30"
                      />
                      <span className="text-[10px] uppercase tracking-[0.3em] font-black">
                        Imagem Exclusiva
                      </span>
                    </div>
                  )}

                  {/* Geometric Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                    <div className="w-16 h-16 border-2 border-white flex items-center justify-center transition-transform duration-500 scale-50 group-hover:scale-100">
                      <ArrowUpRight size={32} className="text-white" />
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="bg-white text-black text-[9px] px-4 py-1.5 font-black uppercase tracking-[0.2em] shadow-xl">
                      {property.purpose === "VENDA" ? "Venda" : "Locação"}
                    </span>
                    {property.featured && (
                      <span
                        className="text-white text-[9px] px-4 py-1.5 font-black uppercase tracking-[0.2em] shadow-xl"
                        style={{ backgroundColor: config.accentColor }}
                      >
                        Destaque
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-8">
                  <div
                    className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-40"
                    style={{ color: config.brandColor }}
                  >
                    <MapPin size={14} className="shrink-0" />
                    <span className="truncate">
                      {[property.neighborhood, property.city]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>

                  <h3
                    className="text-xl font-black tracking-tight mb-6 line-clamp-1 uppercase italic font-display group-hover:text-brand transition-colors"
                    style={{
                      color: config.brandColor,
                    }}
                  >
                    {property.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {property.bedrooms != null && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-stone-100 flex items-center justify-center shrink-0">
                          <Bed size={14} className="opacity-40" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest opacity-60">
                          {property.bedrooms} Quartos
                        </span>
                      </div>
                    )}
                    {property.areaM2 != null && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-stone-100 flex items-center justify-center shrink-0">
                          <SlidersHorizontal
                            size={14}
                            className="rotate-90 opacity-40"
                          />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest opacity-60">
                          {formatArea(property.areaM2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {!property.hidePrice && (
                    <div
                      className="pt-6 border-t-2 flex items-center justify-between gap-4"
                      style={{ borderColor: `${config.brandColor}08` }}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                          {property.purpose === "ALUGUEL"
                            ? "Aluguel"
                            : "Investimento"}
                        </span>
                        <p
                          className="text-2xl md:text-3xl font-black tracking-tighter"
                          style={{ color: config.brandColor }}
                        >
                          {formatBRL(
                            property.purpose === "ALUGUEL"
                              ? property.rentPrice || property.price
                              : property.price,
                          )}
                          {property.purpose === "ALUGUEL" && (
                            <span className="text-sm font-medium opacity-40 ml-1">
                              /mês
                            </span>
                          )}
                        </p>
                      </div>
                      <div
                        className="h-12 w-12 border-2 flex items-center justify-center transition-all duration-500 group-hover:bg-black group-hover:text-white"
                        style={{
                          borderColor: config.brandColor,
                          color: config.brandColor,
                        }}
                      >
                        <ArrowUpRight size={20} strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>
              </a>
            </AnimatedDiv>
          ))}
        </div>
      </div>
    </section>
  );
}
