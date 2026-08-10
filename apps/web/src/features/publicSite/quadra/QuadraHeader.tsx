import { Menu, MessageCircle, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { QuadraStorefrontModel } from "./quadraAdapter";

type QuadraHeaderProps = {
  model: QuadraStorefrontModel;
  visibleSections: ReadonlySet<string>;
};

const navItems = [
  { href: "#home", label: "Início", section: "hero" },
  { href: "#cars", label: "Estoque", section: "stock" },
  { href: "#about", label: "Quem Somos", section: "about" },
  { href: "#contact", label: "Contato", section: "lead" },
] as const;

export function QuadraHeader({ model, visibleSections }: QuadraHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const height = headerRef.current?.offsetHeight;
      if (height) {
        document.documentElement.style.setProperty(
          "--tenant-header-height",
          `${height}px`,
        );
      }
    };
    updateHeaderHeight();
    const logo = headerRef.current?.querySelector("img");
    logo?.addEventListener("load", updateHeaderHeight);
    window.addEventListener("resize", updateHeaderHeight);
    return () => {
      logo?.removeEventListener("load", updateHeaderHeight);
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, [model.logoUrl, navOpen]);

  const phoneEntries = createPhoneEntries(model);

  return (
    <header
      className={`quadra-header ${scrolled ? "quadra-header--scrolled" : ""}`}
      id="header"
      ref={headerRef}
    >
      <div className="quadra-container quadra-header__inner">
        <div className="quadra-header__brand-row">
          <a className="quadra-header__logo-link" href="#home">
            {model.logoUrl ? (
              <img
                alt={model.storeName}
                className="quadra-header__logo"
                src={model.logoUrl}
                style={{ width: `${model.logoWidth}px` }}
              />
            ) : (
              <span className="quadra-header__store-name">
                {model.storeName}
              </span>
            )}
          </a>

          <div className="quadra-header__phones">
            {phoneEntries.map((entry) => (
              <PhoneLink entry={entry} key={`${entry.href}-${entry.label}`} />
            ))}
          </div>

          <button
            aria-expanded={navOpen}
            aria-controls="quadra-primary-navigation"
            aria-label={navOpen ? "Fechar menu" : "Abrir menu"}
            className="quadra-header__menu-button"
            onClick={() => setNavOpen((current) => !current)}
            type="button"
          >
            {navOpen ? <X size={36} /> : <Menu size={36} />}
          </button>
        </div>

        <nav
          aria-label="Navegação principal"
          className={`quadra-header__nav ${navOpen ? "quadra-header__nav--open" : ""}`}
          id="quadra-primary-navigation"
        >
          <div className="quadra-header__mobile-phones">
            {phoneEntries.map((entry) => (
              <PhoneLink entry={entry} key={`${entry.href}-${entry.label}`} />
            ))}
          </div>
          {navItems
            .filter((item) => visibleSections.has(item.section))
            .map((item) => (
              <a
                className="quadra-header__nav-link"
                href={item.href}
                key={item.href}
                onClick={() => setNavOpen(false)}
              >
                {item.label}
              </a>
            ))}
        </nav>
      </div>
    </header>
  );
}

type PhoneEntry = {
  href: string;
  isWhatsapp: boolean;
  label: string;
};

function createPhoneEntries(model: QuadraStorefrontModel): PhoneEntry[] {
  const entries: PhoneEntry[] = [];
  if (model.contact.phone) {
    entries.push({
      href:
        model.contact.whatsappUrl ??
        `tel:${model.contact.phone.replace(/\D/g, "")}`,
      isWhatsapp: Boolean(model.contact.whatsappUrl),
      label: model.contact.phoneLabel || formatPhone(model.contact.phone),
    });
  }
  if (model.contact.phone2) {
    entries.push({
      href: `tel:${model.contact.phone2.replace(/\D/g, "")}`,
      isWhatsapp: false,
      label: model.contact.phone2Label || formatPhone(model.contact.phone2),
    });
  }
  if (model.contact.phone3) {
    entries.push({
      href: `tel:${model.contact.phone3.replace(/\D/g, "")}`,
      isWhatsapp: false,
      label: model.contact.phone3Label || formatPhone(model.contact.phone3),
    });
  }
  return entries;
}

function PhoneLink({ entry }: { entry: PhoneEntry }) {
  const Icon = entry.isWhatsapp ? MessageCircle : Phone;
  return (
    <a
      className="quadra-header__phone"
      href={entry.href}
      rel={entry.isWhatsapp ? "noopener noreferrer" : undefined}
      target={entry.isWhatsapp ? "_blank" : undefined}
    >
      <Icon aria-hidden="true" size={14} />
      <span>{entry.label}</span>
    </a>
  );
}

export function formatPhone(number: string) {
  const digits = number.replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return number;
}
