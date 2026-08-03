import { AtSign, Globe, Mail, MapPin, Phone } from "lucide-react";
import { readString } from "../publicStorefrontTheme";
import type { StorefrontSectionProps } from "./types";

export function StorefrontFooter({ data, tokens }: StorefrontSectionProps) {
  const storeName = tokens.brand.displayName ?? data.settings.store.name;
  const contact = data.settings.contact;
  const theme = data.settings.site.theme;
  const socialLinks = toRecord(theme.socialLinks);
  const address = readString(toRecord(theme.contact).address) ?? contact.city;
  const socialItems = readSocialItems(socialLinks);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--sf-chrome-line)] bg-[var(--sf-chrome-bg)] text-[var(--sf-chrome-ink)]">
      <div className="public-storefront-shell grid gap-10 px-6 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="min-w-0">
          <p className="text-sm font-extrabold uppercase tracking-[0.18em]">
            {storeName}
          </p>
          {data.settings.site.seoDescription ? (
            <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-[var(--sf-chrome-ink-muted)]">
              {data.settings.site.seoDescription}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--sf-chrome-ink-muted)]">
            Contato
          </p>
          <div className="mt-4 grid gap-2.5 text-sm font-semibold">
            {contact.contactPhone ? (
              <a
                className="flex items-center gap-2 transition-colors hover:text-accent"
                href={`tel:${contact.contactPhone}`}
              >
                <Phone aria-hidden="true" className="size-4 text-accent" />
                {contact.contactPhone}
              </a>
            ) : null}
            {contact.contactEmail ? (
              <a
                className="flex items-center gap-2 transition-colors hover:text-accent"
                href={`mailto:${contact.contactEmail}`}
              >
                <Mail aria-hidden="true" className="size-4 text-accent" />
                {contact.contactEmail}
              </a>
            ) : null}
            {address ? (
              <span className="flex items-center gap-2 text-[var(--sf-chrome-ink-muted)]">
                <MapPin aria-hidden="true" className="size-4 text-accent" />
                {address}
              </span>
            ) : null}
          </div>
        </div>

        {socialItems.length ? (
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--sf-chrome-ink-muted)]">
              Redes sociais
            </p>
            <div className="mt-4 grid gap-2.5 text-sm font-semibold">
              {socialItems.map((item) => (
                <a
                  className="flex items-center gap-2 transition-colors hover:text-accent"
                  href={item.href}
                  key={item.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <item.icon
                    aria-hidden="true"
                    className="size-4 text-accent"
                  />
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-[var(--sf-chrome-line)]">
        <div className="public-storefront-shell px-6 py-4 text-xs font-semibold text-[var(--sf-chrome-ink-muted)]">
          © {year} {storeName}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}

function readSocialItems(socialLinks: Record<string, unknown>) {
  const items: Array<{
    href: string;
    icon: typeof AtSign;
    label: string;
  }> = [];
  const instagram = readString(socialLinks.instagram);
  const facebook = readString(socialLinks.facebook);
  const youtube = readString(socialLinks.youtube);
  const tiktok = readString(socialLinks.tiktok);
  if (instagram)
    items.push({ href: instagram, icon: AtSign, label: "Instagram" });
  if (facebook) items.push({ href: facebook, icon: Globe, label: "Facebook" });
  if (youtube) items.push({ href: youtube, icon: Globe, label: "YouTube" });
  if (tiktok) items.push({ href: tiktok, icon: Globe, label: "TikTok" });
  return items;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
