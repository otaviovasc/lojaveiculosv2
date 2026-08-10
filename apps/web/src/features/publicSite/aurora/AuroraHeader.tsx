import { Menu, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { QuadraStorefrontModel } from "../quadra/quadraAdapter";

const navItems = [
  { href: "#inicio", label: "Início", section: "hero" },
  { href: "#estoque", label: "Estoque", section: "stock" },
  { href: "#sobre", label: "A loja", section: "about" },
  { href: "#depoimentos", label: "Clientes", section: "testimonials" },
  { href: "#contato", label: "Contato", section: "lead" },
] as const;

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
            <img alt="" src={model.logoUrl} />
          ) : (
            <span className="aurora-brand__monogram" aria-hidden="true">
              {model.storeName.slice(0, 1)}
            </span>
          )}
          <span className="aurora-brand__copy">
            <strong>{model.storeName}</strong>
            <small>
              <i aria-hidden="true" /> Estoque atualizado
            </small>
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
          {navItems
            .filter((item) => visibleSections.has(item.section))
            .map((item) => (
              <a
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
        </nav>

        {model.contact.whatsappUrl ? (
          <a
            className="aurora-header__cta"
            href={model.contact.whatsappUrl}
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
