import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type FocusEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
  splitVehicleTitle,
} from "../publicVehicleFormatters";
import type { PublicVehicleListing } from "../types";
import { createStorefrontHeroSlides } from "../storefrontHeroSlides";
import type { QuadraStorefrontModel } from "../quadra/quadraAdapter";
import { createAuroraWhatsappUrl } from "./auroraContactModel";

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
  const prefersReducedMotion = Boolean(useReducedMotion());
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeSlide = slides[activeIndex] ?? slides[0];

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
    }, model.hero.speed || 6000);
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    document.getElementById("estoque")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="aurora-hero" id="inicio">
      {/* Background Full Media Stage (Quadra inspired full-bleed media) */}
      <div
        className="aurora-hero__bg-stage"
        onBlur={resumeAfterFocusLeaves}
        onFocus={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode="popLayout">
          {activeSlide ? (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="aurora-hero__media-wrap"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0, scale: 1.04 }}
              key={`${activeSlide.url}-${activeIndex}`}
              transition={{ duration: prefersReducedMotion ? 0 : 0.75 }}
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
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Gradient Overlay for Editorial High-Contrast Text */}
        <div className="aurora-hero__bg-overlay" />
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={`aurora-shell aurora-hero__grid ${
            activeSlide?.vehicle ? "" : "aurora-hero__grid--solo"
          }`}
          exit={{ opacity: 0, y: -12 }}
          initial={{ opacity: 0, y: 12 }}
          key={activeSlide?.vehicle?.slug ?? `banner-${activeIndex}`}
          transition={{ duration: prefersReducedMotion ? 0 : 0.45 }}
        >
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

          {/* Vehicle slides surface their unique specs in a compact glass
              panel (Quadra pattern); the media stays full-bleed behind. */}
          {activeSlide?.vehicle ? (
            <HeroSpecs vehicle={activeSlide.vehicle} />
          ) : null}
        </motion.div>
      </AnimatePresence>

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

function HeroSpecs({ vehicle }: { vehicle: PublicVehicleListing }) {
  return (
    <aside className="aurora-hero__specs" aria-label="Resumo do veículo">
      <span className="aurora-hero__specs-eyebrow">
        <Sparkles aria-hidden="true" /> Destaque da Vitrine
      </span>
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
      <button
        aria-label={`Ver detalhes de ${vehicle.title}`}
        className="aurora-hero__specs-cta"
        onClick={() => {
          document
            .getElementById("estoque")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
        type="button"
      >
        Ver detalhes <ArrowUpRight aria-hidden="true" />
      </button>
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
