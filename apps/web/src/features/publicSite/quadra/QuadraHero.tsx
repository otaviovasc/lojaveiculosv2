import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Tag,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FocusEvent, type ReactNode, useEffect, useState } from "react";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
  splitVehicleTitle,
} from "../publicVehicleFormatters";
import type { PublicVehicleListing } from "../types";
import { createStorefrontHeroSlides } from "../storefrontHeroSlides";
import type { QuadraStorefrontModel } from "./quadraAdapter";

type QuadraHeroProps = {
  model: QuadraStorefrontModel;
  onOpenListing: (listingSlug: string) => void;
};

export function QuadraHero({ model, onOpenListing }: QuadraHeroProps) {
  const slides = createStorefrontHeroSlides(model);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const activeSlide = slides[activeIndex] ?? slides[0];
  const isBannerSlide =
    model.hero.mediaSource === "banners" && !activeSlide?.vehicle;
  const showBannerText = !isBannerSlide || model.hero.bannerShowText;
  const showBannerButton = isBannerSlide && model.hero.bannerShowButton;
  const activeContentKey =
    activeSlide?.vehicle?.slug ?? `banner-${activeIndex}`;

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(current, Math.max(0, slides.length - 1)),
    );
  }, [slides.length]);

  useEffect(() => {
    if (
      !model.hero.autoplay ||
      paused ||
      prefersReducedMotion ||
      slides.length < 2
    )
      return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, model.hero.speed);
    return () => window.clearInterval(interval);
  }, [
    model.hero.autoplay,
    model.hero.speed,
    paused,
    prefersReducedMotion,
    slides.length,
  ]);

  const move = (offset: number) => {
    setActiveIndex(
      (current) => (current + offset + slides.length) % slides.length,
    );
  };

  const resumeAfterFocusLeaves = (event: FocusEvent<HTMLElement>) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      setPaused(false);
    }
  };

  return (
    <section className="quadra-hero" id="home">
      <div
        className="quadra-hero__stage"
        onBlur={resumeAfterFocusLeaves}
        onFocus={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode="popLayout">
          {activeSlide ? (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="quadra-hero__media"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0, scale: 1.02 }}
              key={`${activeSlide.url}-${activeIndex}`}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.6,
                ease: "easeInOut",
              }}
            >
              {activeSlide.kind === "video" ? (
                <video
                  aria-label="Vídeo de destaque da loja"
                  controls
                  playsInline
                  preload="metadata"
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
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="quadra-hero__overlay" />

        <div className="quadra-container quadra-hero__content">
          <AnimatePresence mode="popLayout">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="quadra-hero__content-grid"
              data-slide-key={activeContentKey}
              data-testid="quadra-hero-content-grid"
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: 10 }}
              key={activeContentKey}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.3,
                ease: "easeInOut",
              }}
            >
              <div className="quadra-hero__copy">
                {showBannerText ? (
                  <>
                    <div className="quadra-modern-divider" />
                    <HeroTitle
                      model={model}
                      vehicle={activeSlide?.vehicle ?? null}
                    />
                    <p data-editor-id="hero.subtitle">
                      {activeSlide?.vehicle?.trimName || model.hero.subtitle}
                    </p>
                  </>
                ) : null}
                {activeSlide?.vehicle ? (
                  <button
                    className="quadra-modern-button quadra-modern-button--accent"
                    onClick={() => onOpenListing(activeSlide.vehicle!.slug)}
                    type="button"
                  >
                    Ver veículo
                  </button>
                ) : showBannerButton ? (
                  <a
                    className="quadra-modern-button quadra-modern-button--accent"
                    href="#cars"
                  >
                    {model.hero.bannerButtonText}
                  </a>
                ) : isBannerSlide ? null : (
                  <a
                    className="quadra-modern-button quadra-modern-button--accent"
                    href="#cars"
                  >
                    Ver estoque
                  </a>
                )}
              </div>

              {activeSlide?.vehicle ? (
                <HeroSpecs vehicle={activeSlide.vehicle} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {slides.length > 1 ? (
          <>
            <button
              aria-label="Destaque anterior"
              className="quadra-hero__arrow quadra-hero__arrow--prev"
              onClick={() => move(-1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              aria-label="Próximo destaque"
              className="quadra-hero__arrow quadra-hero__arrow--next"
              onClick={() => move(1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <div className="quadra-hero__pagination">
              {slides.map((slide, index) => (
                <button
                  aria-current={index === activeIndex ? "true" : undefined}
                  aria-label={`Mostrar destaque ${index + 1}`}
                  className={index === activeIndex ? "is-active" : ""}
                  key={`${slide.url}-${index}`}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                >
                  {index === activeIndex ? (
                    <span
                      style={{
                        animationDuration: `${model.hero.speed}ms`,
                        animationPlayState:
                          paused || prefersReducedMotion ? "paused" : "running",
                      }}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function HeroTitle({
  model,
  vehicle,
}: {
  model: QuadraStorefrontModel;
  vehicle: PublicVehicleListing | null;
}) {
  if (vehicle) {
    const title = splitVehicleTitle(vehicle.title);
    return (
      <h1 data-editor-id="hero.title">
        {title.brand}
        {title.restTitle ? (
          <span className="quadra-accent-text">{title.restTitle}</span>
        ) : null}
      </h1>
    );
  }
  return (
    <h1 data-editor-id="hero.title">
      <HighlightedTitle value={model.hero.title} />
    </h1>
  );
}

function HeroSpecs({ vehicle }: { vehicle: PublicVehicleListing }) {
  return (
    <aside className="quadra-hero__specs" aria-label="Resumo do veículo">
      <span className="quadra-hero__specs-eyebrow">Oferta exclusiva</span>
      <Spec icon={CalendarDays} label="Ano modelo">
        {vehicle.manufactureYear ?? "-"}/{vehicle.modelYear ?? "-"}
      </Spec>
      <Spec icon={Gauge} label="Quilometragem">
        {formatPublicVehicleMileage(vehicle.mileageKm)}
      </Spec>
      {vehicle.priceCents === null ? null : (
        <Spec accent icon={Tag} label="Preço especial">
          {formatPublicVehiclePrice(vehicle.priceCents)}
        </Spec>
      )}
    </aside>
  );
}

function Spec({
  accent = false,
  children,
  icon: Icon,
  label,
}: {
  accent?: boolean;
  children: ReactNode;
  icon: typeof CalendarDays;
  label: string;
}) {
  return (
    <div className={accent ? "is-accent" : undefined}>
      <span>
        <Icon aria-hidden="true" />
      </span>
      <p>
        <small>{label}</small>
        <strong>{children}</strong>
      </p>
    </div>
  );
}

function HighlightedTitle({ value }: { value: string }) {
  return value.split(/(\*\*.*?\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span className="quadra-accent-text" key={`${part}-${index}`}>
        {part.slice(2, -2)}
      </span>
    ) : (
      part
    ),
  );
}
