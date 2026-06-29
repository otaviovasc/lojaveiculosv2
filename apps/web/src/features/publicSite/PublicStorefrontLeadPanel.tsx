import { AtSign, Mail, MessageCircle, Phone } from "lucide-react";
import { readString } from "./publicStorefrontTheme";
import type { PublicStorefrontSettingsData } from "./types";

export function LeadPanel({
  ctaLabel,
  settings,
}: {
  ctaLabel: string;
  settings: PublicStorefrontSettingsData;
}) {
  const socialLinks = toRecord(settings.site.theme.socialLinks);
  const instagram = readString(socialLinks.instagram);
  return (
    <section className="bg-panel" id="contato">
      <div className="public-storefront-shell px-4 py-14 md:px-6 md:py-20">
        <div className="grid gap-8 rounded-[2rem] border border-line bg-app p-6 shadow-[0_24px_70px_rgb(15_23_42_/_0.08)] md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-strong">
              Interesse rapido
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">
              Separar veiculo
            </h2>
            <div className="mt-5 grid gap-3 text-sm font-medium text-muted">
              {settings.contact.city ? (
                <span>{settings.contact.city}</span>
              ) : null}
              {settings.contact.contactPhone ? (
                <a
                  className="inline-flex items-center gap-2 transition-colors hover:text-accent"
                  href={`tel:${settings.contact.contactPhone}`}
                >
                  <Phone aria-hidden="true" className="size-4" />
                  {settings.contact.contactPhone}
                </a>
              ) : null}
              {settings.contact.contactEmail ? (
                <a
                  className="inline-flex items-center gap-2 transition-colors hover:text-accent"
                  href={`mailto:${settings.contact.contactEmail}`}
                >
                  <Mail aria-hidden="true" className="size-4" />
                  {settings.contact.contactEmail}
                </a>
              ) : null}
              {instagram ? (
                <a
                  className="inline-flex items-center gap-2 transition-colors hover:text-accent"
                  href={instagram}
                  rel="noreferrer"
                  target="_blank"
                >
                  <AtSign aria-hidden="true" className="size-4" />
                  Instagram
                </a>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3">
            <input
              aria-label="Nome"
              className="min-h-12 rounded-2xl border border-line bg-panel px-4 text-sm font-medium text-app-text outline-none transition-[border-color,box-shadow] focus:border-accent/50 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_14%,transparent)]"
              placeholder="Nome"
            />
            <input
              aria-label="Telefone"
              className="min-h-12 rounded-2xl border border-line bg-panel px-4 text-sm font-medium text-app-text outline-none transition-[border-color,box-shadow] focus:border-accent/50 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_14%,transparent)]"
              placeholder="Telefone"
            />
            <a
              className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-inverse shadow-[0_18px_44px_color-mix(in_oklab,var(--color-accent)_22%,transparent)] transition-[box-shadow,filter,transform] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]"
              href={settings.contact.whatsappUrl ?? undefined}
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              {ctaLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
