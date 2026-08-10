import { Menu, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { QuadraStorefrontModel } from "./quadraAdapter";

type QuadraHeaderProps = {
  model: QuadraStorefrontModel;
  visibleSections: ReadonlySet<string>;
};

const navItems = [
  { href: "#home", label: "Home", section: "hero" },
  { href: "#cars", label: "Anúncios", section: "stock" },
  { href: "#about", label: "Sobre", section: "about" },
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

  const phone = model.contact.phone;
  const whatsappHref = model.contact.whatsappUrl ?? undefined;

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

          {phone ? (
            <a
              className="quadra-header__phone"
              href={whatsappHref ?? `tel:${phone.replace(/\D/g, "")}`}
              rel={whatsappHref ? "noopener noreferrer" : undefined}
              target={whatsappHref ? "_blank" : undefined}
            >
              <Phone aria-hidden="true" size={11} />
              <span>{formatPhone(phone)}</span>
            </a>
          ) : null}

          <button
            aria-expanded={navOpen}
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
        >
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
