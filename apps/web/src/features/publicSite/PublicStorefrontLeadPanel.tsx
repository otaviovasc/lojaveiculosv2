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
    <aside className="rounded-lg border border-line bg-panel p-5 lg:p-6">
      <p className="text-xs font-black uppercase tracking-widest text-muted">
        Interesse rapido
      </p>
      <h2 className="mt-2 text-xl font-black">Separar veiculo</h2>
      <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-muted">
        {settings.contact.city ? <span>{settings.contact.city}</span> : null}
        {settings.contact.contactPhone ? (
          <a
            className="inline-flex items-center gap-1.5"
            href={`tel:${settings.contact.contactPhone}`}
          >
            <Phone aria-hidden="true" className="size-4" />
            {settings.contact.contactPhone}
          </a>
        ) : null}
        {settings.contact.contactEmail ? (
          <a
            className="inline-flex items-center gap-1.5"
            href={`mailto:${settings.contact.contactEmail}`}
          >
            <Mail aria-hidden="true" className="size-4" />
            {settings.contact.contactEmail}
          </a>
        ) : null}
        {instagram ? (
          <a
            className="inline-flex items-center gap-1.5"
            href={instagram}
            rel="noreferrer"
            target="_blank"
          >
            <AtSign aria-hidden="true" className="size-4" />
            Instagram
          </a>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3">
        <input
          aria-label="Nome"
          className="rounded-lg border border-line bg-app p-3 font-bold"
        />
        <input
          aria-label="Telefone"
          className="rounded-lg border border-line bg-app p-3 font-bold"
        />
        <a
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 font-black text-inverse"
          href={settings.contact.whatsappUrl ?? undefined}
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          {ctaLabel}
        </a>
      </div>
    </aside>
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
