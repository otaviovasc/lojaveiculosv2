import { Mail, MapPin, MessageCircle } from "lucide-react";
import type { QuadraStorefrontModel } from "./quadraAdapter";
import { formatPhone } from "./QuadraHeader";
import { InstagramIcon } from "./QuadraSocialIcons";

export function QuadraContact({ model }: { model: QuadraStorefrontModel }) {
  const { contact } = model;

  return (
    <section className="quadra-contact" id="contact">
      <div className="quadra-container">
        <h2 data-editor-id="contact.title">{contact.title}</h2>
        <div className="quadra-contact__grid">
          <div>
            <p data-editor-id="contact.description1">{contact.description1}</p>
            <p data-editor-id="contact.description2">{contact.description2}</p>
          </div>

          <div className="quadra-contact__actions">
            <div className="quadra-contact__buttons">
              {contact.whatsappUrl ? (
                <a
                  className="quadra-button quadra-button--accent"
                  href={withWhatsappMessage(contact.whatsappUrl)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <MessageCircle aria-hidden="true" />
                  Falar no WhatsApp
                </a>
              ) : null}
              {contact.instagramUrl ? (
                <a
                  className="quadra-button quadra-button--primary"
                  href={contact.instagramUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <InstagramIcon />
                  Seguir no Instagram
                </a>
              ) : null}
            </div>

            <div className="quadra-contact__info">
              <h3>Informações de Contato</h3>
              <div>
                {contact.phone ? (
                  <p>
                    <strong>WhatsApp:</strong>
                    <span>{formatPhone(contact.phone)}</span>
                  </p>
                ) : null}
                {contact.email ? (
                  <p>
                    <strong>E-mail:</strong>
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </p>
                ) : null}
                {contact.instagramUrl ? (
                  <p>
                    <strong>Instagram:</strong>
                    <span>{instagramHandle(contact.instagramUrl)}</span>
                  </p>
                ) : null}
                {contact.businessHours ? (
                  <p>
                    <strong>Horário:</strong>
                    <span>{contact.businessHours}</span>
                  </p>
                ) : null}
                {contact.address ? (
                  <p>
                    <strong>Endereço:</strong>
                    <span data-editor-id="contact.address">
                      {contact.address}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {contact.mapEmbedUrl ? (
          <div className="quadra-contact__map">
            <div className="quadra-contact__map-heading">
              <MapPin aria-hidden="true" />
              <div>
                <h3>Localização</h3>
                <p>Veja onde estamos localizados.</p>
              </div>
            </div>
            <iframe
              allowFullScreen
              data-editor-id="contact.map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={contact.mapEmbedUrl}
              title={`Localização de ${model.storeName}`}
            />
          </div>
        ) : null}

        {!contact.whatsappUrl && !contact.instagramUrl && contact.email ? (
          <a
            className="quadra-contact__email-cta"
            href={`mailto:${contact.email}`}
          >
            <Mail aria-hidden="true" />
            Enviar e-mail
          </a>
        ) : null}
      </div>
    </section>
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
