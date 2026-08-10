import { Award, Car, ShieldCheck, Users } from "lucide-react";
import type { ComponentType } from "react";
import type { QuadraStorefrontModel } from "./quadraAdapter";

const featureIcons = [Car, ShieldCheck, Users, Award] as const;

export function QuadraAbout({ model }: { model: QuadraStorefrontModel }) {
  return (
    <section className="quadra-about" id="about">
      <div className="quadra-container quadra-about__inner">
        <div className="quadra-section-heading">
          <h2 data-editor-id="about.title">{model.about.title}</h2>
          <p data-editor-id="about.description">{model.about.description}</p>
        </div>

        <div className="quadra-about__main">
          <div className="quadra-about__copy">
            <div>
              <h3 data-editor-id="about.why_title">{model.about.whyTitle}</h3>
              <p data-editor-id="about.why_text">{model.about.whyText}</p>
            </div>
            <div>
              <a
                className="quadra-button quadra-button--accent"
                href="#contact"
              >
                <span data-editor-id="about.button_text">Fale Conosco</span>
              </a>
            </div>
          </div>

          <div className="quadra-about__visual">
            <div className="quadra-about__visual-content">
              <span>
                <Car aria-hidden="true" />
              </span>
              <h4 data-editor-id="about.visual_title">
                {model.about.visualTitle}
              </h4>
              <p data-editor-id="about.visual_subtitle">
                {model.about.visualSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="quadra-about__features">
          {model.about.features.map((feature, index) => {
            const Icon = featureIcons[index] ?? (Car as ComponentType);
            return (
              <div
                className="quadra-about__feature"
                key={`${feature.title}-${index}`}
              >
                <span>
                  <Icon aria-hidden="true" />
                </span>
                <h4 data-editor-id={`about.feature.${index}.title`}>
                  {feature.title}
                </h4>
                <p data-editor-id={`about.feature.${index}.description`}>
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
