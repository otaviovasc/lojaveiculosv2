import {
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  PublicListingDetailPanel,
  type PublicListingDetailSnapshot,
} from "./PublicListingDetailPanel";
import { PublicVehicleCard } from "./PublicVehicleCard";
import type {
  PublicStorefrontData,
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontSettingsData,
} from "./types";

const proofItems = [
  { icon: CheckCircle2, key: "featured", label: "Estoque conferido" },
  { icon: ShieldCheck, key: "trust", label: "Dados do lojista" },
  { icon: MessageCircle, key: "financing", label: "Atendimento WhatsApp" },
];

type PublicStorefrontProps = {
  data: PublicStorefrontData & { settings: PublicStorefrontSettingsData };
  detail: PublicListingDetailSnapshot;
  onCloseListing: () => void;
  onOpenListing: (listingSlug: string) => void;
  onRetryListing: () => void;
  onSubmitListingInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
};

export function PublicStorefront({
  data,
  detail,
  onCloseListing,
  onOpenListing,
  onRetryListing,
  onSubmitListingInterest,
}: PublicStorefrontProps) {
  const theme = normalizeTheme(data.settings.site.theme);
  const visibleProofItems = proofItems.filter((item) =>
    theme.sections.includes(item.key),
  );
  return (
    <main
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8"
      data-layout={data.settings.site.layoutKey}
    >
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          {data.settings.site.heroImageUrl ? (
            <img
              alt=""
              className="h-44 w-full object-cover"
              src={data.settings.site.heroImageUrl}
            />
          ) : null}
          <div className="p-5 lg:p-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Sparkles aria-hidden="true" className="size-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted">
                  {data.settings.store.publicUrl}
                </p>
                <h2 className="text-2xl font-black md:text-4xl">
                  {theme.headline ||
                    data.settings.site.seoTitle ||
                    data.settings.store.name}
                </h2>
                {data.settings.site.seoDescription ? (
                  <p className="mt-2 max-w-2xl text-sm font-bold text-muted">
                    {data.settings.site.seoDescription}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {visibleProofItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="flex min-h-20 items-center gap-3 rounded-lg bg-app p-4"
                    key={item.label}
                  >
                    <Icon aria-hidden="true" className="size-5 text-accent" />
                    <span className="text-sm font-black">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {theme.sections.includes("contact") ? (
          <LeadPanel settings={data.settings} />
        ) : null}
      </section>

      {theme.sections.includes("featured") ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.listings.map((listing) => (
            <PublicVehicleCard
              key={listing.slug}
              listing={listing}
              onOpen={() => onOpenListing(listing.slug)}
            />
          ))}
        </section>
      ) : null}

      {detail.listingSlug ? (
        <PublicListingDetailPanel
          detail={detail}
          onClose={onCloseListing}
          onRetry={onRetryListing}
          onSubmitInterest={onSubmitListingInterest}
        />
      ) : null}
    </main>
  );
}

const defaultSections = ["featured", "financing", "trust", "contact"];

function normalizeTheme(theme: Record<string, unknown>) {
  return {
    headline: typeof theme.headline === "string" ? theme.headline : "",
    sections: Array.isArray(theme.sections)
      ? theme.sections.filter(
          (item): item is string => typeof item === "string",
        )
      : defaultSections,
  };
}

function LeadPanel({ settings }: { settings: PublicStorefrontSettingsData }) {
  return (
    <aside className="rounded-lg border border-line bg-panel p-5 lg:p-6">
      <p className="text-xs font-black uppercase tracking-widest text-muted">
        Interesse rapido
      </p>
      <h3 className="mt-2 text-xl font-black">Separar veiculo</h3>
      {settings.contact.city ? (
        <p className="mt-2 text-sm font-bold text-muted">
          {settings.contact.city}
        </p>
      ) : null}
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
          Chamar no WhatsApp
        </a>
      </div>
    </aside>
  );
}
