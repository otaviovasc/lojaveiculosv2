import {
  ArrowUp,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import type { QuadraStorefrontModel } from "../quadra/quadraAdapter";
import { InstagramIcon } from "../quadra/QuadraSocialIcons";
import {
  createAuroraWhatsappUrl,
  formatAuroraPhone,
} from "./auroraContactModel";
import { AURORA_NAV_ITEMS } from "./auroraNavigation";

export function AuroraFooter({
  model,
  visibleSections,
}: {
  model: QuadraStorefrontModel;
  visibleSections: ReadonlySet<string>;
}) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="aurora-footer">
      <div className="aurora-shell">
        <div className="aurora-footer__main">
          <div className="aurora-footer__identity">
            {model.logoUrl ? (
              <img
                alt={`Logo ${model.storeName}`}
                className="aurora-footer__logo"
                src={model.logoUrl}
              />
            ) : (
              <strong className="aurora-footer__name">{model.storeName}</strong>
            )}
            <p className="aurora-footer__bio">
              {model.footer.extraInfo ??
                "Veículos com procedência periciada, atendimento humanizado e transparente."}
            </p>
            {model.footer.cnpj ? (
              <p className="aurora-footer__legal">CNPJ: {model.footer.cnpj}</p>
            ) : null}
          </div>

          <nav aria-label="Navegação do rodapé" className="aurora-footer__nav">
            <small>Navegação</small>
            {AURORA_NAV_ITEMS.filter((link) =>
              visibleSections.has(link.section),
            ).map((link) => (
              <a href={link.href} key={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="aurora-footer__contact">
            <small>Atendimento & Contato</small>
            {model.contact.phone ? (
              <a
                className="aurora-footer__contact-item"
                href={
                  (model.contact.whatsappUrl
                    ? createAuroraWhatsappUrl(model.contact.whatsappUrl)
                    : null) ?? `tel:${model.contact.phone.replace(/\D/g, "")}`
                }
              >
                <Phone aria-hidden="true" />
                <span>{formatAuroraPhone(model.contact.phone)}</span>
              </a>
            ) : null}
            {model.contact.email ? (
              <a
                className="aurora-footer__contact-item"
                href={`mailto:${model.contact.email}`}
              >
                <Mail aria-hidden="true" />
                <span>{model.contact.email}</span>
              </a>
            ) : null}
            {model.contact.businessHours ? (
              <div className="aurora-footer__contact-item">
                <Clock aria-hidden="true" />
                <span>{model.contact.businessHours}</span>
              </div>
            ) : null}
            {model.contact.address ? (
              <div className="aurora-footer__contact-item">
                <MapPin aria-hidden="true" />
                <span>{model.contact.address}</span>
              </div>
            ) : null}
          </div>

          {model.contact.whatsappUrl || model.contact.instagramUrl ? (
            <div className="aurora-footer__social">
              <small>Redes & Mensagem</small>
              <div className="aurora-footer__social-links">
                {model.contact.whatsappUrl ? (
                  <a
                    className="aurora-footer__social-btn aurora-footer__social-btn--wa"
                    href={createAuroraWhatsappUrl(model.contact.whatsappUrl)}
                    rel="noopener noreferrer"
                    target="_blank"
                    title="Conversar no WhatsApp"
                  >
                    <MessageCircle aria-hidden="true" /> WhatsApp
                  </a>
                ) : null}
                {model.contact.instagramUrl ? (
                  <a
                    className="aurora-footer__social-btn"
                    href={model.contact.instagramUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    title="Visitar perfil no Instagram"
                  >
                    <InstagramIcon aria-hidden="true" /> Instagram
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="aurora-footer__bottom">
          <span>
            © {new Date().getFullYear()} {model.storeName}. Todos os direitos
            reservados.
          </span>
          <button
            className="aurora-footer__scroll-top"
            onClick={scrollToTop}
            type="button"
          >
            Voltar ao topo <ArrowUp aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
