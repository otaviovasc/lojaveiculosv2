import { DEFAULT_STOREFRONT_ABOUT_IMAGES } from "@lojaveiculosv2/shared";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  Gauge,
  MessageCircle,
  Pause,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
  splitVehicleTitle,
} from "../publicVehicleFormatters";
import type { PublicVehicleListing } from "../types";
import { createStorefrontHeroSlides } from "../storefrontHeroSlides";
import type { QuadraStorefrontModel } from "../quadra/quadraAdapter";
import { createAuroraWhatsappUrl } from "./auroraContactModel";

const QUICK_CATEGORY_TAGS = [
  "Todos",
  "SUVs",
  "Sedans",
  "Hatchbacks",
  "Pickups",
  "Flex",
  "Automático",
] as const;

export function AuroraHero({
  listingCount,
  model,
  onSearch,
  query,
}: {
  listingCount: number;
  model: QuadraStorefrontModel;
  onSearch: (query: string) => void;
  query: string;
}) {
  const slides = createStorefrontHeroSlides(model);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeSlide = slides[activeIndex] ?? slides[0];

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(current, Math.max(0, slides.length - 1)),
    );
  }, [slides.length]);

  useEffect(() => {
    if (!model.hero.autoplay || paused || slides.length < 2) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, model.hero.speed || 6000);
    return () => window.clearInterval(interval);
  }, [model.hero.autoplay, model.hero.speed, paused, slides.length]);

  const move = (offset: number) => {
    setActiveIndex(
      (current) => (current + offset + slides.length) % slides.length,
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    document.getElementById("estoque")?.scrollIntoView({ behavior: "smooth" });
  };

  const selectCategory = (tag: string) => {
    onSearch(tag === "Todos" ? "" : tag);
    document.getElementById("estoque")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="aurora-hero" id="inicio">
      {/* Background Full Media Stage (Quadra inspired full-bleed media) */}
      <div
        className="aurora-hero__bg-stage"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {activeSlide ? (
          <div
            className="aurora-hero__media-wrap"
            key={`${activeSlide.url}-${activeIndex}`}
          >
            {activeSlide.kind === "video" ? (
              <video
                aria-label="Vídeo de destaque da loja"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                ref={videoRef}
                src={activeSlide.url}
              />
            ) : activeSlide.mobileUrl ? (
              <picture>
                <source
                  media="(max-width: 767px)"
                  srcSet={activeSlide.mobileUrl}
                />
                <img
                  alt={activeSlide.alt}
                  fetchPriority={activeIndex === 0 ? "high" : "auto"}
                  src={activeSlide.url}
                />
              </picture>
            ) : (
              <img
                alt={activeSlide.alt}
                fetchPriority={activeIndex === 0 ? "high" : "auto"}
                src={activeSlide.url}
              />
            )}
          </div>
        ) : null}

        {/* Gradient Overlay for Editorial High-Contrast Text */}
        <div className="aurora-hero__bg-overlay" />
      </div>

      <div className="aurora-shell aurora-hero__grid">
        <div className="aurora-hero__copy">
          <p className="aurora-eyebrow">
            <Sparkles aria-hidden="true" /> Curadoria Automotiva Premium
          </p>

          {activeSlide?.vehicle ? (
            <VehicleTitle vehicle={activeSlide.vehicle} />
          ) : (
            <h1>
              <HighlightedTitle value={model.hero.title} />
            </h1>
          )}

          <p className="aurora-hero__subtitle">
            {activeSlide?.vehicle?.trimName || model.hero.subtitle}
          </p>

          <form className="aurora-search" onSubmit={submit}>
            <Search aria-hidden="true" />
            <input
              aria-label="Buscar no estoque"
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Busque por marca, modelo ou versão..."
              type="search"
              value={query}
            />
            <button type="submit">
              Explorar <ArrowDownRight aria-hidden="true" />
            </button>
          </form>

          <div className="aurora-hero__quick-meta">
            <span className="aurora-hero__stock-pill">
              <strong>{listingCount}</strong> veículos disponíveis
            </span>
            <span className="aurora-hero__meta-dot">•</span>
            <span className="aurora-hero__meta-text">
              <ShieldCheck aria-hidden="true" /> Procedência & Laudo Cautelar
            </span>
          </div>
        </div>

        {/* Premium Featured Vehicle Showcase Card */}
        <div className="aurora-hero__visual">
          {activeSlide?.vehicle ? (
            <div className="aurora-hero__showcase-card">
              <div className="aurora-hero__showcase-media">
                <img alt={activeSlide.alt} src={activeSlide.url} />
                <span className="aurora-hero__showcase-badge">
                  <Sparkles aria-hidden="true" /> Destaque da Vitrine
                </span>
              </div>
              <div className="aurora-hero__showcase-body">
                <div className="aurora-hero__showcase-header">
                  <h3>{activeSlide.vehicle.title}</h3>
                  <p>{activeSlide.vehicle.trimName}</p>
                </div>

                <div className="aurora-hero__showcase-tags">
                  <span>
                    <CalendarDays aria-hidden="true" />{" "}
                    {activeSlide.vehicle.manufactureYear}/
                    {activeSlide.vehicle.modelYear}
                  </span>
                  <span>
                    <Gauge aria-hidden="true" />{" "}
                    {formatPublicVehicleMileage(activeSlide.vehicle.mileageKm)}
                  </span>
                </div>

                <div className="aurora-hero__showcase-footer">
                  <strong>
                    {formatPublicVehiclePrice(activeSlide.vehicle.priceCents)}
                  </strong>
                  <button
                    aria-label={`Ver detalhes de ${activeSlide.vehicle.title}`}
                    onClick={() => {
                      document
                        .getElementById("estoque")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    type="button"
                  >
                    Ver detalhes <ArrowUpRight aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <a
              className="aurora-hero__showcase-card aurora-hero__showcase-card--banner"
              href="#estoque"
            >
              <div className="aurora-hero__showcase-media">
                <img
                  alt={activeSlide?.alt ?? `Showroom ${model.storeName}`}
                  src={
                    activeSlide?.url ??
                    DEFAULT_STOREFRONT_ABOUT_IMAGES.secondary
                  }
                />
                <span className="aurora-hero__showcase-badge">
                  Estoque Selecionado
                </span>
              </div>
              <div className="aurora-hero__showcase-body">
                <h3>Conheça nosso estoque completo</h3>
                <p>Veículos selecionados com procedência e garantia</p>
                <div className="aurora-hero__showcase-footer">
                  <span className="aurora-hero__showcase-action">
                    Explorar vitrine <ArrowUpRight aria-hidden="true" />
                  </span>
                </div>
              </div>
            </a>
          )}
        </div>
      </div>

      {/* Slide Navigation Controls */}
      {slides.length > 1 ? (
        <div className="aurora-hero__controls">
          <button
            aria-label="Destaque anterior"
            className="aurora-hero__arrow"
            onClick={() => move(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <div className="aurora-hero__dots">
            {slides.map((slide, index) => (
              <button
                aria-current={index === activeIndex ? "true" : undefined}
                aria-label={`Destaque ${index + 1}`}
                className={index === activeIndex ? "is-active" : ""}
                key={`${slide.url}-${index}`}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
          <button
            aria-label="Próximo destaque"
            className="aurora-hero__arrow"
            onClick={() => move(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function VehicleTitle({ vehicle }: { vehicle: PublicVehicleListing }) {
  const title = splitVehicleTitle(vehicle.title);
  return (
    <h1>
      {title.brand}{" "}
      {title.restTitle ? (
        <span className="aurora-accent-text">{title.restTitle}</span>
      ) : null}
    </h1>
  );
}

function HighlightedTitle({ value }: { value: string }) {
  const parts = value.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <span className="aurora-accent-text" key={`${part}-${index}`}>
            {part.slice(2, -2)}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
