import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { QuadraStorefrontModel } from "../quadra/quadraAdapter";
import { InstagramIcon } from "../quadra/QuadraSocialIcons";

export function AuroraAbout({ model }: { model: QuadraStorefrontModel }) {
  return (
    <section className="aurora-about" id="sobre">
      <div className="aurora-shell aurora-about__grid">
        <div className="aurora-about__intro">
          <p className="aurora-eyebrow">
            <Sparkles aria-hidden="true" /> Nossa essência
          </p>
          <h2>{model.about.title}</h2>
          <p>{model.about.description}</p>
        </div>
        <div className="aurora-about__feature-grid">
          {model.about.features.map((feature, index) => (
            <article key={`${feature.title}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <ShieldCheck aria-hidden="true" />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AuroraTestimonials({
  model,
}: {
  model: QuadraStorefrontModel;
}) {
  if (!model.testimonials.length) return null;
  return (
    <section className="aurora-testimonials" id="depoimentos">
      <div className="aurora-shell">
        <header className="aurora-section-heading">
          <div>
            <p className="aurora-eyebrow">Histórias reais</p>
            <h2>Confiança que continua depois da chave.</h2>
          </div>
        </header>
        <div className="aurora-testimonials__track">
          {model.testimonials.map((testimonial) => (
            <blockquote key={testimonial.id}>
              <span aria-hidden="true">“</span>
              <p>{testimonial.quote}</p>
              <footer>
                {testimonial.imageUrl ? (
                  <img alt="" src={testimonial.imageUrl} />
                ) : (
                  <i aria-hidden="true">{testimonial.name.slice(0, 1)}</i>
                )}
                <div>
                  <strong>{testimonial.name}</strong>
                  <small>{testimonial.role}</small>
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AuroraContact({ model }: { model: QuadraStorefrontModel }) {
  return (
    <section className="aurora-contact" id="contato">
      <div className="aurora-shell aurora-contact__grid">
        <div className="aurora-contact__copy">
          <p className="aurora-eyebrow">Atendimento concierge</p>
          <h2>{model.contact.title}</h2>
          <p>{model.contact.description1}</p>
          {model.contact.whatsappUrl ? (
            <a
              href={model.contact.whatsappUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageCircle aria-hidden="true" /> Conversar no WhatsApp
              <ArrowUpRight aria-hidden="true" />
            </a>
          ) : null}
        </div>
        <div className="aurora-contact__details">
          {model.contact.address ? (
            <p>
              <MapPin aria-hidden="true" />
              <span>
                <small>Endereço</small>
                {model.contact.address}
              </span>
            </p>
          ) : null}
          {model.contact.businessHours ? (
            <p>
              <Clock3 aria-hidden="true" />
              <span>
                <small>Horários</small>
                {model.contact.businessHours}
              </span>
            </p>
          ) : null}
          {model.contact.email ? (
            <a href={`mailto:${model.contact.email}`}>
              <Mail aria-hidden="true" />
              <span>
                <small>E-mail</small>
                {model.contact.email}
              </span>
            </a>
          ) : null}
          {model.contact.instagramUrl ? (
            <a
              href={model.contact.instagramUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <InstagramIcon aria-hidden="true" />
              <span>
                <small>Instagram</small>Visitar perfil
              </span>
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function AuroraFooter({ model }: { model: QuadraStorefrontModel }) {
  return (
    <footer className="aurora-footer">
      <div className="aurora-shell">
        <strong>{model.storeName}</strong>
        <p>
          Veículos selecionados, atendimento humano e negociação transparente.
        </p>
        <a href="#inicio">
          Voltar ao início <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
