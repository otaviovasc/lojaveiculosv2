"use client";

import { PropertyMap } from "@/components/property/PropertyMap";
import { PropertyPhotoGallery } from "@/components/property/PropertyPhotoGallery";
import { formatArea, formatBRL } from "@/lib/utils";
import { type PropertyPhotoWithSpace } from "@/modules/properties/lib/photo-space";
import { PropertyContactCard } from "@/modules/storefront/components/PropertyContactCard";
import { AuroraFooter } from "@/modules/storefront/templates/aurora/AuroraFooter";
import { AuroraHeader } from "@/modules/storefront/templates/aurora/AuroraHeader";
import { AuroraWhatsAppButton } from "@/modules/storefront/templates/aurora/AuroraWhatsAppButton";
import { QuadraFooter } from "@/modules/storefront/templates/quadra/QuadraFooter";
import { QuadraHeader } from "@/modules/storefront/templates/quadra/QuadraHeader";
import { QuadraWhatsAppButton } from "@/modules/storefront/templates/quadra/QuadraWhatsAppButton";
import type { StoreConfig } from "@centroimovel/types";
import {
  AMENITY_LABELS,
  formatPhotoSpaceLabel,
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@centroimovel/types";
import {
  Bath,
  Bed,
  Car,
  CheckCircle2,
  MapPin,
  SlidersHorizontal,
} from "lucide-react";

export interface PropertyDetailPhoto {
  id: string;
  url: string;
  isCover?: boolean;
  order: number;
  spaceType?: string | null;
  spaceIndex?: number | null;
  spaceLabel?: string | null;
  spaceOrder?: number;
  orderInSpace?: number;
}

interface PropertyDetailViewProps {
  property: {
    id: string;
    title: string;
    type: string;
    purpose: string;
    price: number;
    rentPrice: number | null;
    condoFee: number | null;
    iptu: number | null;
    areaM2: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    suites: number | null;
    parkingSpots: number | null;
    floor: number | null;
    totalFloors: number | null;
    builtYear: number | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    street: string | null;
    number: string | null;
    cep: string | null;
    latitude: number | null;
    longitude: number | null;
    description: string | null;
    videoUrl: string | null;
    virtualTourUrl: string | null;
    hidePrice: boolean;
    amenities: string[];
    photos: PropertyDetailPhoto[];
  };
  config: StoreConfig;
  workspaceSlug: string;
  workspaceId: string;
  templateId?: "aurora" | "quadra";
  isCaptacao?: boolean;
}

function toPhotoWithSpace(p: PropertyDetailPhoto): PropertyPhotoWithSpace {
  const spaceType = p.spaceType as
    PropertyPhotoWithSpace["spaceType"] | undefined;
  return {
    id: p.id,
    url: p.url,
    isCover: p.isCover ?? false,
    order: p.order,
    spaceType: spaceType ?? null,
    spaceIndex: p.spaceIndex ?? null,
    spaceLabel:
      p.spaceLabel ??
      (spaceType
        ? formatPhotoSpaceLabel({ spaceType, spaceIndex: p.spaceIndex })
        : null),
    spaceOrder: p.spaceOrder ?? 0,
    orderInSpace: p.orderInSpace ?? 0,
  };
}

import { AnimatedDiv } from "@/components/ui/animated-div";

export function PropertyDetailView({
  property,
  config,
  workspaceSlug,
  workspaceId,
  templateId = "aurora",
  isCaptacao = false,
}: PropertyDetailViewProps) {
  const typeLabel =
    PROPERTY_TYPE_LABELS[property.type as keyof typeof PROPERTY_TYPE_LABELS] ??
    property.type;
  const purposeLabel =
    PROPERTY_PURPOSE_LABELS[
      property.purpose as keyof typeof PROPERTY_PURPOSE_LABELS
    ] ?? property.purpose;
  const photosWithSpace = property.photos.map(toPhotoWithSpace);

  const Header = templateId === "quadra" ? QuadraHeader : AuroraHeader;
  const Footer = templateId === "quadra" ? QuadraFooter : AuroraFooter;
  const WhatsAppButton =
    templateId === "quadra" ? QuadraWhatsAppButton : AuroraWhatsAppButton;

  return (
    <div
      className="min-h-screen selection:bg-brand/20 font-body"
      style={{
        backgroundColor:
          config.backgroundColor ??
          (templateId === "aurora" ? "#F8F5F0" : "#FFFCF7"),
      }}
    >
      <Header
        config={config}
        slug={workspaceSlug}
        hasHero={false}
        isPropertiesPage
      />

      <main className="w-full pt-20 pb-24">
        {/* Photo gallery - Edge to edge on desktop */}
        <AnimatedDiv className="relative mb-12 md:mb-20">
          <PropertyPhotoGallery
            photos={photosWithSpace}
            propertyTitle={property.title}
            accentColor={config.accentColor}
            variant="mosaic"
            className="w-full"
            workspaceId={workspaceId}
            propertyId={property.id}
          />
          <div className="absolute top-6 left-6 md:left-12 flex gap-3 pointer-events-none z-10">
            <span
              className="rounded-full px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl backdrop-blur-xl border border-white/20"
              style={{ backgroundColor: config.accentColor }}
            >
              {purposeLabel}
            </span>
            <span className="rounded-full bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl">
              {typeLabel}
            </span>
          </div>
        </AnimatedDiv>

        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 xl:gap-24">
            {/* Left Column: Details */}
            <div className="space-y-16 md:space-y-24">
              {/* Title & location */}
              <AnimatedDiv delay={0.1}>
                <div
                  className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-40"
                  style={{ color: config.brandColor }}
                >
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate italic">
                    {[property.neighborhood, property.city]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <h1
                  className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[0.95] mb-8 uppercase italic font-display"
                  style={{
                    color: config.brandColor,
                  }}
                >
                  {property.title}
                </h1>
                {property.street && (
                  <p
                    className="text-lg opacity-60 font-medium max-w-2xl"
                    style={{ color: config.brandColor }}
                  >
                    {[
                      property.street,
                      property.number,
                      property.neighborhood,
                      property.city,
                      property.state,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </AnimatedDiv>

              {/* Quick Specs Grid */}
              <AnimatedDiv
                delay={0.2}
                className="grid grid-cols-2 sm:grid-cols-4 gap-12 py-12 border-y"
                style={{ borderColor: `${config.brandColor}15` }}
              >
                <div className="flex flex-col gap-3">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40"
                    style={{ color: config.brandColor }}
                  >
                    Área útil
                  </span>
                  <span
                    className="text-xl font-black flex items-center gap-3 uppercase tracking-tight"
                    style={{ color: config.brandColor }}
                  >
                    <SlidersHorizontal
                      size={20}
                      className="rotate-90 opacity-30"
                    />
                    {property.areaM2 ? formatArea(property.areaM2) : "--"}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40"
                    style={{ color: config.brandColor }}
                  >
                    Dormitórios
                  </span>
                  <span
                    className="text-xl font-black flex items-center gap-3 uppercase tracking-tight"
                    style={{ color: config.brandColor }}
                  >
                    <Bed size={20} className="opacity-30" />
                    {property.bedrooms || "--"}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40"
                    style={{ color: config.brandColor }}
                  >
                    Banheiros
                  </span>
                  <span
                    className="text-xl font-black flex items-center gap-3 uppercase tracking-tight"
                    style={{ color: config.brandColor }}
                  >
                    <Bath size={20} className="opacity-30" />
                    {property.bathrooms || "--"}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40"
                    style={{ color: config.brandColor }}
                  >
                    Vagas
                  </span>
                  <span
                    className="text-xl font-black flex items-center gap-3 uppercase tracking-tight"
                    style={{ color: config.brandColor }}
                  >
                    <Car size={20} className="opacity-30" />
                    {property.parkingSpots || "--"}
                  </span>
                </div>
              </AnimatedDiv>

              {/* Description */}
              {property.description && (
                <AnimatedDiv delay={0.3} className="max-w-4xl">
                  <h2
                    className="text-[10px] font-black uppercase tracking-[0.4em] mb-8"
                    style={{ color: config.accentColor }}
                  >
                    Apresentação do Imóvel
                  </h2>
                  <div className="prose prose-stone max-w-none">
                    <p
                      className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap opacity-70 font-medium italic"
                      style={{ color: config.brandColor }}
                    >
                      {property.description}
                    </p>
                  </div>
                </AnimatedDiv>
              )}

              {/* Amenities */}
              {property.amenities.length > 0 && (
                <AnimatedDiv delay={0.4}>
                  <h2
                    className="text-[10px] font-black uppercase tracking-[0.4em] mb-10"
                    style={{ color: config.accentColor }}
                  >
                    Comodidades & Infraestrutura
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-12">
                    {property.amenities.map((a) => (
                      <div key={a} className="flex items-center gap-4 group">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110"
                          style={{
                            borderColor: `${config.accentColor}30`,
                            backgroundColor: `${config.accentColor}05`,
                            color: config.accentColor,
                          }}
                        >
                          <CheckCircle2 size={18} />
                        </div>
                        <span
                          className="text-base font-bold tracking-tight"
                          style={{ color: config.brandColor }}
                        >
                          {AMENITY_LABELS[a as keyof typeof AMENITY_LABELS] ??
                            a}
                        </span>
                      </div>
                    ))}
                  </div>
                </AnimatedDiv>
              )}

              {/* Location / Map */}
              <AnimatedDiv delay={0.5}>
                <PropertyMap
                  latitude={property.latitude}
                  longitude={property.longitude}
                  cep={property.cep}
                  street={property.street}
                  number={property.number}
                  neighborhood={property.neighborhood}
                  city={property.city}
                  state={property.state}
                  addressLabel={[
                    property.street,
                    property.number,
                    property.neighborhood,
                    property.city,
                    property.state,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  sectionTitle="Localização Privilegiada"
                  sectionTitleClassName="text-[10px] font-black uppercase tracking-[0.4em] mb-10"
                  sectionTitleStyle={{
                    color: config.accentColor,
                  }}
                />
              </AnimatedDiv>
            </div>

            {/* Right Column: Sticky Pricing & CTA */}
            <aside className="relative">
              <AnimatedDiv
                delay={0.3}
                className="lg:sticky lg:top-32 space-y-8"
              >
                <PropertyContactCard
                  property={{
                    id: property.id,
                    title: property.title,
                    price: property.price,
                    rentPrice: property.rentPrice,
                    condoFee: property.condoFee,
                    iptu: property.iptu,
                    hidePrice: property.hidePrice,
                    purpose: property.purpose,
                  }}
                  config={config}
                  workspaceSlug={workspaceSlug}
                  workspaceId={workspaceId}
                  formatBRL={formatBRL}
                  isCaptacao={isCaptacao}
                />

                {/* Secondary Corretor Info */}
                <div className="rounded-[2.5rem] p-10 bg-white border border-stone-100 flex flex-col items-center text-center gap-6 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)]">
                  <div
                    className="h-20 w-20 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-2xl"
                    style={{ backgroundColor: config.brandColor }}
                  >
                    {(config.corretorName || workspaceSlug)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p
                      className="text-[9px] font-black opacity-30 uppercase tracking-[0.3em] mb-2"
                      style={{ color: config.brandColor }}
                    >
                      Assessoria Exclusiva
                    </p>
                    <p
                      className="text-xl font-black uppercase italic tracking-tight"
                      style={{ color: config.brandColor }}
                    >
                      {config.corretorName || workspaceSlug}
                    </p>
                  </div>
                  <div className="w-12 h-px bg-stone-100" />
                  <p className="text-xs font-medium opacity-50 max-w-[200px]">
                    Especialista em curadoria de imóveis de alto padrão e
                    negociações exclusivas.
                  </p>
                </div>
              </AnimatedDiv>
            </aside>
          </div>
        </div>
      </main>

      <Footer config={config} slug={workspaceSlug} />
      <WhatsAppButton config={config} />
    </div>
  );
}
