import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type FocusEvent,
  useEffect,
  useState,
} from "react";
import type { QuadraStorefrontModel } from "./quadraAdapter";

const AUTOPLAY_DELAY_MS = 5000;

type SliderLayout = {
  gap: number;
  slidesPerView: number;
};

export function QuadraTestimonials({
  model,
}: {
  model: QuadraStorefrontModel;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [layout, setLayout] = useState<SliderLayout>(() => sliderLayout());
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const lastIndex = Math.max(
    0,
    model.testimonials.length - layout.slidesPerView,
  );

  useEffect(() => {
    const updateLayout = () => setLayout(sliderLayout());
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, lastIndex));
  }, [lastIndex]);

  useEffect(() => {
    if (lastIndex === 0 || paused || prefersReducedMotion) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current >= lastIndex ? 0 : current + 1));
    }, AUTOPLAY_DELAY_MS);
    return () => window.clearInterval(interval);
  }, [lastIndex, paused, prefersReducedMotion]);

  if (!model.testimonials.length) return null;

  const translatePercent = (activeIndex * 100) / layout.slidesPerView;
  const translateGap = (activeIndex * layout.gap) / layout.slidesPerView;
  const trackStyle = {
    transform: `translateX(calc(-${translatePercent}% - ${translateGap}px))`,
  } satisfies CSSProperties;

  const resumeAfterFocusLeaves = (event: FocusEvent<HTMLElement>) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      setPaused(false);
    }
  };

  return (
    <section className="quadra-testimonials" id="depoimentos">
      <div className="quadra-container">
        <header className="quadra-testimonials__heading">
          <div>
            <div className="quadra-modern-divider" />
            <span>Depoimentos</span>
            <h2>
              O que nossos{" "}
              <strong className="quadra-accent-text">clientes</strong> dizem
            </h2>
          </div>
          {lastIndex > 0 ? (
            <div className="quadra-testimonials__arrows">
              <button
                aria-label="Depoimento anterior"
                onClick={() =>
                  setActiveIndex((current) =>
                    current === 0 ? lastIndex : current - 1,
                  )
                }
                type="button"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                aria-label="Próximo depoimento"
                onClick={() =>
                  setActiveIndex((current) =>
                    current === lastIndex ? 0 : current + 1,
                  )
                }
                type="button"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </header>

        <div
          className="quadra-testimonials__slider"
          onBlur={resumeAfterFocusLeaves}
          onFocus={() => setPaused(true)}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="quadra-testimonials__viewport">
            <div className="quadra-testimonials__track" style={trackStyle}>
              {model.testimonials.map((testimonial) => (
                <article
                  className="quadra-testimonial-card"
                  key={testimonial.id}
                >
                  {testimonial.imageUrl ? (
                    <img
                      alt={testimonial.name}
                      className="quadra-testimonial-card__image"
                      loading="lazy"
                      src={testimonial.imageUrl}
                    />
                  ) : null}
                  <div className="quadra-testimonial-card__content">
                    <div className="quadra-modern-divider" />
                    <div
                      aria-label="5 de 5 estrelas"
                      className="quadra-testimonial-card__stars"
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star aria-hidden="true" key={index} />
                      ))}
                    </div>
                    <blockquote title={testimonial.quote}>
                      &quot;{clampText(testimonial.quote, 160)}&quot;
                    </blockquote>
                    <footer>
                      <h3 title={testimonial.name}>
                        {clampText(testimonial.name, 60)}
                      </h3>
                      <span>{testimonial.role}</span>
                    </footer>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {lastIndex > 0 ? (
            <div
              aria-label="Paginação dos depoimentos"
              className="quadra-testimonials__pagination"
            >
              {Array.from({ length: lastIndex + 1 }, (_, index) => (
                <button
                  aria-current={index === activeIndex ? "true" : undefined}
                  aria-label={`Mostrar depoimento ${index + 1}`}
                  className={index === activeIndex ? "is-active" : ""}
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function sliderLayout(): SliderLayout {
  if (typeof window === "undefined") return { gap: 24, slidesPerView: 1 };
  if (window.innerWidth >= 1280) return { gap: 40, slidesPerView: 3 };
  if (window.innerWidth >= 1024) return { gap: 32, slidesPerView: 2 };
  if (window.innerWidth >= 640) return { gap: 32, slidesPerView: 1 };
  return { gap: 24, slidesPerView: 1 };
}
