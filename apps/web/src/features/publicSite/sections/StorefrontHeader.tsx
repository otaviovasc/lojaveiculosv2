import { MessageCircle } from "lucide-react";
import type { SectionType } from "../config/types";
import type { StorefrontSectionProps } from "./types";

const navItems: ReadonlyArray<{
  href: string;
  label: string;
  section: SectionType;
}> = [
  { href: "#estoque", label: "Estoque", section: "stock" },
  { href: "#sobre", label: "Sobre", section: "about" },
  { href: "#contato", label: "Contato", section: "lead" },
];

export function StorefrontHeader({
  data,
  sections,
  spec,
  tokens,
}: StorefrontSectionProps) {
  const storeName = tokens.brand.displayName ?? data.settings.store.name;
  const whatsappUrl = data.settings.contact.whatsappUrl;
  const visibleNavItems = navItems.filter((item) =>
    sections.some((section) => section.type === item.section),
  );
  const variant =
    spec.variant === "standard"
      ? tokens.color.chrome === "dark"
        ? "overlay"
        : "opaque"
      : spec.variant;
  const isOverlay = variant === "overlay";

  return (
    <header
      className={
        isOverlay
          ? "absolute inset-x-0 top-0 z-40 bg-[var(--sf-chrome-glass)] text-[var(--sf-chrome-ink)] backdrop-blur-md"
          : "sticky top-0 z-40 border-b border-[var(--sf-chrome-line)] bg-[var(--sf-chrome-bg)] text-[var(--sf-chrome-ink)]"
      }
      data-variant={variant}
    >
      <div className="public-storefront-shell flex min-h-16 items-center justify-between gap-4 px-6">
        <a className="flex min-w-0 items-center gap-3" href="#topo">
          <StorefrontHeaderMark
            logoUrl={tokens.brand.logoUrl}
            storeName={storeName}
          />
          <span className="truncate text-sm font-extrabold uppercase tracking-[0.18em]">
            {storeName}
          </span>
        </a>

        {visibleNavItems.length ? (
          <nav
            aria-label="Navegação da vitrine"
            className="hidden items-center gap-6 md:flex"
          >
            {visibleNavItems.map((item) => (
              <a
                className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--sf-chrome-ink-muted)] transition-colors hover:text-[var(--sf-chrome-ink)]"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}

        {whatsappUrl ? (
          <a
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[var(--sf-radius)] bg-accent px-4 text-xs font-bold uppercase tracking-[0.12em] text-accent-foreground transition-all duration-300 hover:brightness-105 active:scale-95"
            href={whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            WhatsApp
          </a>
        ) : null}
      </div>
    </header>
  );
}

function StorefrontHeaderMark({
  logoUrl,
  storeName,
}: {
  logoUrl: string | null;
  storeName: string;
}) {
  if (logoUrl) {
    return (
      <img
        alt=""
        className="size-9 shrink-0 rounded-[var(--sf-radius)] border border-[var(--sf-chrome-line)] object-cover"
        src={logoUrl}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-[var(--sf-radius)] bg-accent text-sm font-black text-accent-foreground"
    >
      {storeName.trim().charAt(0).toUpperCase() || "L"}
    </span>
  );
}
