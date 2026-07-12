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
      <div className="public-storefront-shell px-6 py-16 md:py-20">
        <div className="grid gap-8 rounded-lg border border-line bg-app p-6 shadow-sm md:grid-cols-[0.95fr_1.05fr] md:p-10">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-accent-strong">
              INTERESSE RÁPIDO
            </p>
            <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
              Separar veículo
            </h2>
            <div className="mt-6 grid gap-3 text-sm font-semibold text-muted">
              {settings.contact.city ? (
                <span className="flex items-center gap-2 rounded bg-panel p-3 border border-line/60">
                  Cidade: {settings.contact.city}
                </span>
              ) : null}
              {settings.contact.contactPhone ? (
                <a
                  className="flex items-center gap-2 rounded bg-panel p-3 border border-line/60 transition-colors hover:text-accent"
                  href={`tel:${settings.contact.contactPhone}`}
                >
                  <Phone aria-hidden="true" className="size-4 text-accent" />
                  {settings.contact.contactPhone}
                </a>
              ) : null}
              {settings.contact.contactEmail ? (
                <a
                  className="flex items-center gap-2 rounded bg-panel p-3 border border-line/60 transition-colors hover:text-accent"
                  href={`mailto:${settings.contact.contactEmail}`}
                >
                  <Mail aria-hidden="true" className="size-4 text-accent" />
                  {settings.contact.contactEmail}
                </a>
              ) : null}
              {instagram ? (
                <a
                  className="flex items-center gap-2 rounded bg-panel p-3 border border-line/60 transition-colors hover:text-accent"
                  href={instagram}
                  rel="noreferrer"
                  target="_blank"
                >
                  <AtSign aria-hidden="true" className="size-4 text-accent" />
                  Instagram
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <input
              aria-label="Nome"
              className="min-h-12 rounded border border-line bg-panel px-4 text-sm font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
              placeholder="Seu nome"
            />
            <input
              aria-label="Telefone"
              className="min-h-12 rounded border border-line bg-panel px-4 text-sm font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
              placeholder="Seu telefone"
            />
            <a
              className="flex min-h-12 items-center justify-center gap-2 rounded bg-accent px-5 text-sm font-bold text-inverse shadow-[0_4px_12px_color-mix(in_oklab,var(--color-accent)_15%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_color-mix(in_oklab,var(--color-accent)_25%,transparent)] hover:brightness-105 active:translate-y-0 active:scale-95"
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
