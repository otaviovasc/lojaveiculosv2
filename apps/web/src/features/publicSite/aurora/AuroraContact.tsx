import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import type { ReactNode } from "react";
import { StorefrontLeadCaptureForm } from "../LeadCaptureForm";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
} from "../types";
import type { QuadraStorefrontModel } from "../quadra/quadraAdapter";
import { InstagramIcon } from "../quadra/QuadraSocialIcons";
import {
  createAuroraWhatsappUrl,
  getAuroraContactPhones,
} from "./auroraContactModel";

export function AuroraContact({
  model,
  onSubmitInterest,
}: {
  model: QuadraStorefrontModel;
  onSubmitInterest: (
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
}) {
  const { contact } = model;
  const phones = getAuroraContactPhones(model);
  return (
    <section className="aurora-contact" id="contato">
      <div className="aurora-shell">
        <header className="aurora-contact__heading">
          <p className="aurora-eyebrow">Atendimento sem atalhos</p>
          <div>
            <h2 data-editor-id="contact.title">{contact.title}</h2>
            <div>
              <p data-editor-id="contact.description1">
                {contact.description1}
              </p>
              <p data-editor-id="contact.description2">
                {contact.description2}
              </p>
            </div>
          </div>
        </header>

        <div
          className={`aurora-contact__content ${contact.showMap ? "has-map" : ""}`}
        >
          <div className="aurora-contact__panel">
            <div className="aurora-contact__details">
              {phones.map((phone) => (
                <ContactItem
                  href={phone.href}
                  icon={<Phone aria-hidden="true" />}
                  key={`${phone.label}-${phone.value}`}
                  label={phone.label}
                  targetBlank={phone.targetBlank}
                  value={phone.value}
                />
              ))}
              {contact.email ? (
                <ContactItem
                  href={`mailto:${contact.email}`}
                  icon={<Mail aria-hidden="true" />}
                  label="E-mail"
                  value={contact.email}
                />
              ) : null}
              {contact.instagramUrl ? (
                <ContactItem
                  href={contact.instagramUrl}
                  icon={<InstagramIcon aria-hidden="true" />}
                  label="Instagram"
                  targetBlank
                  value="Visitar perfil"
                />
              ) : null}
              {contact.businessHours ? (
                <ContactItem
                  icon={<Clock3 aria-hidden="true" />}
                  label="Horários"
                  value={contact.businessHours}
                />
              ) : null}
              {contact.address ? (
                <ContactItem
                  icon={<MapPin aria-hidden="true" />}
                  label="Endereço"
                  value={contact.address}
                />
              ) : null}
            </div>
            {contact.whatsappUrl ? (
              <a
                className="aurora-contact__whatsapp"
                href={createAuroraWhatsappUrl(contact.whatsappUrl)}
                rel="noopener noreferrer"
                target="_blank"
              >
                <MessageCircle aria-hidden="true" />
                <span>
                  <small>Resposta direta da equipe</small>
                  Conversar no WhatsApp
                </span>
                <ArrowUpRight aria-hidden="true" />
              </a>
            ) : null}
          </div>

          {contact.showMap ? (
            <div className="aurora-contact__map">
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
                <div className="aurora-contact__map-placeholder">
                  <MapPin aria-hidden="true" />
                  <span>Localização da loja</span>
                  <strong>Configure seu mapa no Personalizar</strong>
                  <p>
                    Adicione a URL de incorporação do Google Maps para mostrar
                    sua localização aqui.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {model.leadForm.showOnLandingPage ? (
          <div className="aurora-contact__lead-form">
            <p className="aurora-eyebrow">Atendimento personalizado</p>
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

function ContactItem({
  href,
  icon,
  label,
  targetBlank = false,
  value,
}: {
  href?: string;
  icon: ReactNode;
  label: string;
  targetBlank?: boolean;
  value: string;
}) {
  const content = (
    <>
      {icon}
      <span>
        <small>{label}</small>
        {value}
      </span>
    </>
  );
  return href ? (
    <a
      href={href}
      rel={targetBlank ? "noopener noreferrer" : undefined}
      target={targetBlank ? "_blank" : undefined}
    >
      {content}
    </a>
  ) : (
    <p>{content}</p>
  );
}
