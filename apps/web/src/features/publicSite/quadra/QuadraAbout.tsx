import { Award, Car, Handshake, ShieldCheck, Star, Users } from "lucide-react";
import { motion, type Transition, useReducedMotion } from "motion/react";
import type { ComponentType } from "react";
import type { QuadraStorefrontModel } from "./quadraAdapter";

const featureIcons = [Car, ShieldCheck, Users, Award, Handshake, Star] as const;

const rowTransition: Transition = { duration: 0.6, ease: [0.21, 1, 0.36, 1] };

export function QuadraAbout({ model }: { model: QuadraStorefrontModel }) {
  const prefersReducedMotion = useReducedMotion();
  const reveal = (direction: "left" | "right") =>
    ({
      initial: prefersReducedMotion
        ? false
        : { opacity: 0, x: direction === "left" ? 40 : -40 },
      transition: rowTransition,
      viewport: { amount: 0.25, once: true },
      whileInView: { opacity: 1, x: 0 },
    }) as const;

  return (
    <section className="quadra-about" id="about">
      <div className="quadra-container">
        <div className="quadra-about__row">
          <motion.div className="quadra-about__copy" {...reveal("right")}>
            <span className="quadra-about__eyebrow">
              Conheça a {model.storeName}
            </span>
            <h2 data-editor-id="about.title">{model.about.title}</h2>
            <div className="quadra-modern-divider" />
            <p data-editor-id="about.description">{model.about.description}</p>
            <p data-editor-id="about.curadoria_text">
              {model.about.curadoriaText}
            </p>
            <a
              className="quadra-modern-button quadra-modern-button--accent"
              href="#contact"
            >
              <span data-editor-id="about.button_text">
                {model.about.buttonText}
              </span>
            </a>
          </motion.div>
          <AboutImage
            alt={`Fachada e identidade de ${model.storeName}`}
            className="quadra-about__image--primary"
            src={model.about.image1Url}
          />
        </div>

        <div className="quadra-about__row quadra-about__row--reverse">
          <AboutImage
            alt={`Showroom de ${model.storeName}`}
            className="quadra-about__image--secondary"
            src={model.about.image2Url}
          />
          <motion.div className="quadra-about__why" {...reveal("left")}>
            <h3 data-editor-id="about.why_title">{model.about.whyTitle}</h3>
            <p data-editor-id="about.why_text">{model.about.whyText}</p>
            <div className="quadra-about__features">
              {model.about.features.map((feature, index) => {
                const Icon = featureIcons[index] ?? (Car as ComponentType);
                return (
                  <article key={`${feature.title}-${index}`}>
                    <span>
                      <Icon aria-hidden="true" />
                    </span>
                    <h4 data-editor-id={`about.feature.${index}.title`}>
                      {feature.title}
                    </h4>
                    <p data-editor-id={`about.feature.${index}.description`}>
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function AboutImage({
  alt,
  className,
  src,
}: {
  alt: string;
  className: string;
  src: string;
}) {
  return (
    <div className={`quadra-about__image ${className}`}>
      <span aria-hidden="true" />
      <img alt={alt} loading="lazy" src={src} />
    </div>
  );
}
