import { Mail, MessageCircle, Phone } from "lucide-react";
import type { QuadraStorefrontModel } from "./quadraAdapter";
import { formatPhone } from "./QuadraHeader";
import { InstagramIcon } from "./QuadraSocialIcons";

const platformLogo = "/icons/logo_lv.svg";

export function QuadraFooter({ model }: { model: QuadraStorefrontModel }) {
  const { contact } = model;
  const hasStoreInfo = Boolean(contact.address);
  const hasContacts = Boolean(
    contact.phone || contact.email || contact.instagramUrl,
  );

  if (!hasStoreInfo && !hasContacts) {
    return (
      <footer className="quadra-footer quadra-footer--compact" id="footer">
        <div className="quadra-container">
          <PlatformSignature />
        </div>
      </footer>
    );
  }

  return (
    <footer className="quadra-footer" id="footer">
      <div className="quadra-container">
        <div className="quadra-footer__grid">
          <div>
            <h3>Informações</h3>
            {model.logoUrl ? (
              <img
                alt={model.storeName}
                className="quadra-footer__store-logo"
                loading="lazy"
                src={model.logoUrl}
                style={{ width: `${Math.min(model.logoWidth, 120)}px` }}
              />
            ) : (
              <strong className="quadra-footer__store-name">
                {model.storeName}
              </strong>
            )}
            {contact.address ? (
              <p className="quadra-footer__address">
                <strong>Endereço:</strong>
                <span data-editor-id="footer.address">{contact.address}</span>
              </p>
            ) : null}
          </div>

          <div>
            <h3>Contato</h3>
            <div className="quadra-footer__contacts">
              {contact.phone ? (
                <a
                  href={
                    contact.whatsappUrl ??
                    `tel:${contact.phone.replace(/\D/g, "")}`
                  }
                  rel={contact.whatsappUrl ? "noopener noreferrer" : undefined}
                  target={contact.whatsappUrl ? "_blank" : undefined}
                >
                  <span className="quadra-footer__contact-icon">
                    {contact.whatsappUrl ? (
                      <MessageCircle aria-hidden="true" />
                    ) : (
                      <Phone aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    <strong>WhatsApp</strong>
                    <span data-editor-id="footer.phone">
                      {formatPhone(contact.phone)}
                    </span>
                  </span>
                </a>
              ) : null}
              {contact.email ? (
                <a href={`mailto:${contact.email}`}>
                  <span className="quadra-footer__contact-icon">
                    <Mail aria-hidden="true" />
                  </span>
                  <span>
                    <strong>E-mail</strong>
                    <span>{contact.email}</span>
                  </span>
                </a>
              ) : null}
              {contact.instagramUrl ? (
                <a
                  href={contact.instagramUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="quadra-footer__contact-icon">
                    <InstagramIcon />
                  </span>
                  <span>
                    <strong>Instagram</strong>
                    <span data-editor-id="footer.instagram">
                      Acessar perfil
                    </span>
                  </span>
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="quadra-footer__signature">
          <PlatformSignature />
        </div>
      </div>
    </footer>
  );
}

function PlatformSignature() {
  return (
    <a
      className="quadra-footer__platform"
      href="https://www.lojaveiculos.com.br"
      rel="noopener noreferrer"
      target="_blank"
    >
      <span>Feito com Loja Veículos</span>
      <img alt="Loja Veículos" loading="lazy" src={platformLogo} />
    </a>
  );
}
