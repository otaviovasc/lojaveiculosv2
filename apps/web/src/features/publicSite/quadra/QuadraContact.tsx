import { Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { StorefrontLeadCaptureForm } from "../LeadCaptureForm";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
} from "../types";
import type { QuadraStorefrontModel } from "./quadraAdapter";
import { formatPhone } from "./QuadraHeader";
import { InstagramIcon } from "./QuadraSocialIcons";

export function QuadraContact({
  model,
  onSubmitInterest,
}: {
  model: QuadraStorefrontModel;
  onSubmitInterest: (
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
}) {
  const { contact } = model;
  const whatsappHref = contact.whatsappUrl
    ? withWhatsappMessage(contact.whatsappUrl)
    : null;

  return (
    <section className="quadra-contact" id="contact">
      <div className="quadra-container">
        <header className="quadra-contact__heading">
          <div className="quadra-modern-divider" />
          <span>Fale conosco</span>
          <h2 data-editor-id="contact.title">{contact.title}</h2>
          <p data-editor-id="contact.description1">{contact.description1}</p>
          <p data-editor-id="contact.description2">{contact.description2}</p>
        </header>

        <div
          className={`quadra-contact__layout ${contact.showMap ? "has-map" : ""}`}
        >
          <div className="quadra-contact__cards">
            {whatsappHref && contact.phone ? (
              <ContactCard
                href={whatsappHref}
                icon={MessageCircle}
                label={contact.phoneLabel || "WhatsApp"}
                targetBlank
                value={formatPhone(contact.phone)}
              />
            ) : null}
            {contact.instagramUrl ? (
              <ContactCard
                href={contact.instagramUrl}
                icon={InstagramIcon}
                label="Instagram"
                targetBlank
                value={instagramHandle(contact.instagramUrl)}
              />
            ) : null}
            {contact.phone2 ? (
              <ContactCard
                href={`tel:${contact.phone2.replace(/\D/g, "")}`}
                icon={Phone}
                label={contact.phone2Label || "Telefone"}
                value={formatPhone(contact.phone2)}
              />
            ) : null}
            {contact.phone3 ? (
              <ContactCard
                href={`tel:${contact.phone3.replace(/\D/g, "")}`}
                icon={Phone}
                label={contact.phone3Label || "Comercial"}
                value={formatPhone(contact.phone3)}
              />
            ) : null}
            {contact.email ? (
              <ContactCard
                href={`mailto:${contact.email}`}
                icon={Mail}
                label="E-mail"
                value={contact.email}
              />
            ) : null}
            {contact.businessHours ? (
              <article className="quadra-contact-card">
                <span>
                  <Clock3 aria-hidden="true" />
                </span>
                <p>
                  <strong>Horário</strong>
                  <small>{contact.businessHours}</small>
                </p>
              </article>
            ) : null}
            {contact.address ? (
              <article className="quadra-contact-card quadra-contact-card--wide">
                <span>
                  <MapPin aria-hidden="true" />
                </span>
                <p>
                  <strong>Endereço</strong>
                  <small data-editor-id="contact.address">
                    {contact.address}
                  </small>
                </p>
              </article>
            ) : null}
          </div>

          {contact.showMap ? (
            <div className="quadra-contact__map">
              {contact.mapEmbedUrl ? (
                <iframe
                  allowFullScreen
                  data-editor-id="contact.map"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={contact.mapEmbedUrl}
                  title={`Localização de ${model.storeName}`}
                />
              ) : (
                <div className="quadra-contact__map-placeholder">
                  <MapPin aria-hidden="true" />
                  <strong>Configure o mapa da sua loja</strong>
                  <span>
                    Adicione a URL de incorporação do Google Maps em
                    Personalizar.
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {model.leadForm.showOnLandingPage ? (
          <div className="quadra-contact__lead-form">
            <h3>Envie uma mensagem</h3>
            <StorefrontLeadCaptureForm
              defaultMessage="Olá, tenho interesse. Por favor entre em contato."
              onSubmitInterest={onSubmitInterest}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ContactCard({
  href,
  icon: Icon,
  label,
  targetBlank = false,
  value,
}: {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  targetBlank?: boolean;
  value: string;
}) {
  return (
    <a
      className="quadra-contact-card"
      href={href}
      rel={targetBlank ? "noopener noreferrer" : undefined}
      target={targetBlank ? "_blank" : undefined}
    >
      <span>
        <Icon aria-hidden="true" />
      </span>
      <p>
        <strong>{label}</strong>
        <small>{value}</small>
      </p>
    </a>
  );
}

function withWhatsappMessage(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  const message =
    "Olá! Gostaria de mais informações sobre os veículos disponíveis.";
  return `${url}${separator}text=${encodeURIComponent(message)}`;
}

function instagramHandle(url: string) {
  try {
    const handle = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
    return handle ? `@${handle}` : url;
  } catch {
    return url;
  }
}
