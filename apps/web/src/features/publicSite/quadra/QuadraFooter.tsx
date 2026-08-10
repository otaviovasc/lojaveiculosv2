import {
  Building2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import type { QuadraStorefrontModel } from "./quadraAdapter";
import { formatPhone } from "./QuadraHeader";
import { InstagramIcon } from "./QuadraSocialIcons";

const platformLogo = "/icons/logo_lv_white.svg";

export function QuadraFooter({ model }: { model: QuadraStorefrontModel }) {
  const { contact } = model;
  return (
    <footer className="quadra-footer" id="footer">
      <div className="quadra-container">
        <div className="quadra-footer__grid">
          <div className="quadra-footer__identity">
            {model.logoUrl ? (
              <img
                alt={model.storeName}
                loading="lazy"
                src={model.logoUrl}
                style={{ width: `${Math.min(model.logoWidth, 140)}px` }}
              />
            ) : (
              <strong>{model.storeName}</strong>
            )}
            {contact.address ? (
              <p>
                <MapPin aria-hidden="true" />
                <span data-editor-id="footer.address">{contact.address}</span>
              </p>
            ) : null}
            {model.footer.extraInfo ? <p>{model.footer.extraInfo}</p> : null}
            {model.footer.cnpj ? (
              <p>
                <Building2 aria-hidden="true" />
                <span>CNPJ {model.footer.cnpj}</span>
              </p>
            ) : null}
          </div>

          <div>
            <h3>Navegação</h3>
            <nav aria-label="Navegação do rodapé">
              <a href="#home">Início</a>
              <a href="#cars">Estoque</a>
              <a href="#about">Quem Somos</a>
              <a href="#contact">Contato</a>
            </nav>
          </div>

          <div>
            <h3>Contato</h3>
            <div className="quadra-footer__contacts">
              {contact.phone ? (
                <FooterLink
                  href={
                    contact.whatsappUrl ??
                    `tel:${contact.phone.replace(/\D/g, "")}`
                  }
                  icon={contact.whatsappUrl ? MessageCircle : Phone}
                  targetBlank={Boolean(contact.whatsappUrl)}
                >
                  {formatPhone(contact.phone)}
                </FooterLink>
              ) : null}
              {contact.phone2 ? (
                <FooterLink
                  href={`tel:${contact.phone2.replace(/\D/g, "")}`}
                  icon={Phone}
                >
                  {formatPhone(contact.phone2)}
                </FooterLink>
              ) : null}
              {contact.phone3 ? (
                <FooterLink
                  href={`tel:${contact.phone3.replace(/\D/g, "")}`}
                  icon={Phone}
                >
                  {formatPhone(contact.phone3)}
                </FooterLink>
              ) : null}
              {contact.email ? (
                <FooterLink href={`mailto:${contact.email}`} icon={Mail}>
                  {contact.email}
                </FooterLink>
              ) : null}
              {contact.instagramUrl ? (
                <FooterLink
                  href={contact.instagramUrl}
                  icon={InstagramIcon}
                  targetBlank
                >
                  Instagram
                </FooterLink>
              ) : null}
              {contact.businessHours ? (
                <p>
                  <Clock3 aria-hidden="true" />
                  <span>{contact.businessHours}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="quadra-footer__bottom">
          <span>
            © {new Date().getFullYear()} {model.storeName}
          </span>
          <a
            href="https://www.lojaveiculos.com.br"
            rel="noopener noreferrer"
            target="_blank"
          >
            Feito com
            <img alt="Loja Veículos" loading="lazy" src={platformLogo} />
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  children,
  href,
  icon: Icon,
  targetBlank = false,
}: {
  children: ReactNode;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  targetBlank?: boolean;
}) {
  return (
    <a
      href={href}
      rel={targetBlank ? "noopener noreferrer" : undefined}
      target={targetBlank ? "_blank" : undefined}
    >
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </a>
  );
}
