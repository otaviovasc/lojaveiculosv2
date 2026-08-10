import { Quote, Star } from "lucide-react";
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
        <div className="quadra-section-heading">
          <span className="quadra-testimonials__heading-icon">
            <Quote aria-hidden="true" />
          </span>
          <h2>O Que Nossos Clientes Dizem</h2>
          <p>
            A satisfação dos nossos clientes é a nossa maior conquista. Veja o
            que eles têm a dizer sobre nós.
          </p>
        </div>

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
                  <div className="quadra-testimonial-card__author">
                    <span>
                      <Quote aria-hidden="true" />
                    </span>
                    <div>
                      <h3 title={testimonial.name}>
                        {clampText(testimonial.name, 60)}
                      </h3>
                      <div aria-label="5 de 5 estrelas">
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star aria-hidden="true" key={index} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="quadra-testimonial-card__quote">
                    <Quote
                      aria-hidden="true"
                      className="quadra-testimonial-card__watermark"
                    />
                    <blockquote title={testimonial.quote}>
                      &quot;{clampText(testimonial.quote, 160)}&quot;
                    </blockquote>
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
