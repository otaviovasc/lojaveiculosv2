import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type FocusEvent, type FormEvent, useEffect, useState } from "react";
import type { QuadraStorefrontModel } from "./quadraAdapter";

type QuadraHeroProps = {
  model: QuadraStorefrontModel;
  onSearch: (query: string) => void;
  query: string;
};

const fadeDown = {
  hidden: { opacity: 0, y: -30 },
  show: { opacity: 1, transition: { duration: 0.7 }, y: 0 },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, transition: { duration: 0.7 }, y: 0 },
};

export function QuadraHero({ model, onSearch, query }: QuadraHeroProps) {
  const banners = model.hero.bannerUrls;
  const useBanners = banners.length > 0;

  if (useBanners && banners.length) {
    return (
      <QuadraHeroBanner
        autoplay={model.hero.autoplay}
        banners={banners}
        onSearch={onSearch}
        query={query}
        speed={model.hero.speed}
      />
    );
  }

  return (
    <section className="quadra-hero" id="home">
      <div className="quadra-container quadra-hero__content">
        <div className="quadra-hero__grid">
          <div className="quadra-hero__copy">
            <motion.h1
              data-editor-id="hero.title"
              initial="hidden"
              variants={fadeDown}
              viewport={{ amount: 0.6 }}
              whileInView="show"
            >
              <HighlightedTitle value={model.hero.title} />
            </motion.h1>
            <motion.p
              data-editor-id="hero.subtitle"
              initial="hidden"
              variants={fadeDown}
              viewport={{ amount: 0.6 }}
              whileInView="show"
            >
              {model.hero.subtitle}
            </motion.p>
          </div>

          <motion.div
            className="quadra-hero__image-wrap"
            initial="hidden"
            variants={fadeUp}
            viewport={{ amount: 0.6 }}
            whileInView="show"
          >
            {model.hero.imageUrl && model.hero.imageKind === "video" ? (
              <video
                aria-label="Vídeo de destaque"
                autoPlay
                className="quadra-hero__image"
                data-editor-id="hero.image"
                loop
                muted
                playsInline
                src={model.hero.imageUrl}
              />
            ) : model.hero.imageUrl ? (
              <img
                alt="carro"
                className="quadra-hero__image"
                data-editor-id="hero.image"
                fetchPriority="high"
                src={model.hero.imageUrl}
              />
            ) : (
              <div className="quadra-hero__image-placeholder" aria-hidden />
            )}
          </motion.div>
        </div>

        <QuadraSearch onSearch={onSearch} query={query} />
      </div>
    </section>
  );
}

function QuadraHeroBanner({
  autoplay,
  banners,
  onSearch,
  query,
  speed,
}: {
  autoplay: boolean;
  banners: readonly string[];
  onSearch: (query: string) => void;
  query: string;
  speed: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const activeBanner = banners[activeIndex] ?? banners[0];

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(current, Math.max(0, banners.length - 1)),
    );
  }, [banners.length]);

  useEffect(() => {
    if (!autoplay || paused || prefersReducedMotion || banners.length < 2)
      return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, speed);
    return () => window.clearInterval(interval);
  }, [autoplay, banners.length, paused, prefersReducedMotion, speed]);

  const move = (offset: number) => {
    setActiveIndex(
      (current) => (current + offset + banners.length) % banners.length,
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
    <section className="quadra-banner" id="home">
      <div
        className="quadra-banner__viewport"
        onBlur={resumeAfterFocusLeaves}
        onFocus={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <a
          aria-label="Ver estoque"
          className="quadra-banner__link"
          href="#cars"
        >
          {activeBanner ? (
            <img
              alt={`Banner promocional ${activeIndex + 1}`}
              className="quadra-banner__image"
              fetchPriority="high"
              src={activeBanner}
            />
          ) : null}
        </a>
        {banners.length > 1 ? (
          <>
            <button
              aria-label="Banner anterior"
              className="quadra-banner__arrow quadra-banner__arrow--prev"
              onClick={() => move(-1)}
              type="button"
            >
              <ChevronLeft />
            </button>
            <button
              aria-label="Próximo banner"
              className="quadra-banner__arrow quadra-banner__arrow--next"
              onClick={() => move(1)}
              type="button"
            >
              <ChevronRight />
            </button>
            <div className="quadra-banner__dots">
              {banners.map((banner, index) => (
                <button
                  aria-label={`Mostrar banner ${index + 1}`}
                  className={index === activeIndex ? "is-active" : ""}
                  key={`${banner}-${index}`}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      <div className="quadra-container quadra-banner__search">
        <QuadraSearch onSearch={onSearch} query={query} />
      </div>
    </section>
  );
}

export function QuadraSearch({
  onSearch,
  query,
}: {
  onSearch: (query: string) => void;
  query: string;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    document.getElementById("cars")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="quadra-search">
      <form onSubmit={submit}>
        <div className="quadra-search__field">
          <Search aria-hidden="true" />
          <input
            aria-label="Buscar carros"
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar carros..."
            type="search"
            value={query}
          />
        </div>
        <button type="submit">
          <Search aria-hidden="true" />
          Buscar
        </button>
      </form>
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
