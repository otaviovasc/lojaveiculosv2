import { Menu, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { QuadraStorefrontModel } from "../quadra/quadraAdapter";
import { createAuroraWhatsappUrl } from "./auroraContactModel";
import { AURORA_NAV_ITEMS } from "./auroraNavigation";

export function AuroraHeader({
  model,
  visibleSections,
}: {
  model: QuadraStorefrontModel;
  visibleSections: ReadonlySet<string>;
}) {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const update = () => setCompact(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className={`aurora-header ${compact ? "is-compact" : ""}`}>
      <div className="aurora-shell aurora-header__bar">
        <a className="aurora-brand" href="#inicio">
          {model.logoUrl ? (
            <img alt={`Logo ${model.storeName}`} src={model.logoUrl} />
          ) : null}
          <span className="aurora-brand__copy">
            <strong>{model.storeName}</strong>
          </span>
        </a>

        <button
          aria-expanded={open}
          aria-controls="aurora-primary-navigation"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="aurora-header__menu"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>

        <nav
          aria-label="Navegação principal"
          className={open ? "is-open" : ""}
          id="aurora-primary-navigation"
        >
          {AURORA_NAV_ITEMS.filter((item) =>
            visibleSections.has(item.section),
          ).map((item) => (
            <a href={item.href} key={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>

        {model.contact.whatsappUrl ? (
          <a
            className="aurora-header__cta"
            href={createAuroraWhatsappUrl(model.contact.whatsappUrl)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle aria-hidden="true" />
            Falar com a loja
          </a>
        ) : null}
      </div>
    </header>
  );
}
