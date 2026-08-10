import {
  ArrowDownRight,
  Award,
  CheckCircle,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import type { QuadraStorefrontModel } from "../quadra/quadraAdapter";

const FEATURE_ICONS = [ShieldCheck, Award, Zap, HeartHandshake] as const;

export function AuroraAbout({ model }: { model: QuadraStorefrontModel }) {
  return (
    <section className="aurora-about" id="sobre">
      <div className="aurora-shell">
        <div className="aurora-about__story-grid">
          <div className="aurora-about__intro">
            <p className="aurora-eyebrow">
              <Sparkles aria-hidden="true" /> Nossa Essência & Compromisso
            </p>
            <h2 data-editor-id="about.title">{model.about.title}</h2>
            <p data-editor-id="about.description">{model.about.description}</p>

            <div className="aurora-about__actions">
              <a className="aurora-text-link" href="#contato">
                {model.about.buttonText} <ArrowDownRight aria-hidden="true" />
              </a>
            </div>

            {/* Dealership Stats Counter Grid */}
            <div className="aurora-about__stats-bar">
              <div className="aurora-about__stat-card">
                <CheckCircle aria-hidden="true" />
                <div>
                  <strong>100%</strong>
                  <span>Laudo Cautelar</span>
                </div>
              </div>
              <div className="aurora-about__stat-card">
                <Star aria-hidden="true" />
                <div>
                  <strong>5.0 ★</strong>
                  <span>Avaliação Média</span>
                </div>
              </div>
              <div className="aurora-about__stat-card aurora-about__stat-card--expand">
                <Award aria-hidden="true" />
                <div>
                  <strong>Garantia</strong>
                  <span>Motor & Câmbio</span>
                </div>
              </div>
            </div>
          </div>

          <div className="aurora-about__media">
            <figure className="aurora-about__image aurora-about__image--primary">
              <img
                alt={`Fachada e atendimento da ${model.storeName}`}
                data-editor-id="about.image1"
                loading="lazy"
                src={model.about.image1Url}
              />
              <figcaption>
                <small>{model.about.visualSubtitle}</small>
                <strong>{model.about.visualTitle}</strong>
              </figcaption>
            </figure>
            <figure className="aurora-about__image aurora-about__image--secondary">
              <img
                alt={`Showroom da ${model.storeName}`}
                data-editor-id="about.image2"
                loading="lazy"
                src={model.about.image2Url}
              />
              <figcaption>
                <Sparkles aria-hidden="true" />
                <span>{model.about.curadoriaText}</span>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="aurora-about__why">
          <header>
            <p className="aurora-eyebrow">Diferenciais da Nossa Loja</p>
            <h3 data-editor-id="about.whyTitle">{model.about.whyTitle}</h3>
            <p data-editor-id="about.whyText">{model.about.whyText}</p>
          </header>
          <div className="aurora-about__feature-grid">
            {model.about.features.map((feature, index) => {
              const FeatureIcon =
                FEATURE_ICONS[index % FEATURE_ICONS.length] ?? ShieldCheck;
              return (
                <article
                  className="aurora-about__feature-card"
                  key={`${feature.title}-${index}`}
                >
                  <FeatureIcon
                    aria-hidden="true"
                    className="aurora-about__feature-bg-icon"
                  />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
