import {
  Car,
  CheckCircle2,
  Eye,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  PublicListingDetailPanel,
  type PublicListingDetailSnapshot,
} from "./PublicListingDetailPanel";
import type {
  PublicStorefrontData,
  PublicStorefrontSettingsData,
  PublicVehicleListing,
} from "./types";

const proofItems = [
  { icon: CheckCircle2, label: "Estoque conferido" },
  { icon: ShieldCheck, label: "Dados do lojista" },
  { icon: MessageCircle, label: "Atendimento WhatsApp" },
];

type PublicStorefrontProps = {
  data: PublicStorefrontData & { settings: PublicStorefrontSettingsData };
  detail: PublicListingDetailSnapshot;
  onCloseListing: () => void;
  onOpenListing: (listingSlug: string) => void;
  onRetryListing: () => void;
};

export function PublicStorefront({
  data,
  detail,
  onCloseListing,
  onOpenListing,
  onRetryListing,
}: PublicStorefrontProps) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
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
                  {data.settings.site.seoTitle ?? data.settings.store.name}
                </h2>
                {data.settings.site.seoDescription ? (
                  <p className="mt-2 max-w-2xl text-sm font-bold text-muted">
                    {data.settings.site.seoDescription}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {proofItems.map((item) => {
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

        <LeadPanel settings={data.settings} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.listings.map((listing) => (
          <VehicleCard
            key={listing.slug}
            listing={listing}
            onOpen={() => onOpenListing(listing.slug)}
          />
        ))}
      </section>

      {detail.listingSlug ? (
        <PublicListingDetailPanel
          detail={detail}
          onClose={onCloseListing}
          onRetry={onRetryListing}
        />
      ) : null}
    </main>
  );
}

function VehicleCard({
  listing,
  onOpen,
}: {
  listing: PublicVehicleListing;
  onOpen: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-panel">
      <div className="flex aspect-[16/9] items-center justify-center bg-accent-soft text-accent">
        <Car aria-hidden="true" className="size-12" />
      </div>
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-lg font-black">{listing.title}</h3>
          <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-black text-accent">
            Disponivel
          </span>
        </div>
        <p className="text-2xl font-black text-accent">
          {formatPrice(listing.priceCents)}
        </p>
        <p className="mt-3 min-h-10 text-sm font-semibold text-muted">
          {listing.description}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black text-muted">
          <Metric label="Ano" value={listing.modelYear ?? "-"} />
          <Metric label="Km" value={formatMileage(listing.mileageKm)} />
          <Metric label="Cod." value={listing.slug.slice(0, 8)} />
        </div>
        <button
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 font-black text-inverse"
          onClick={onOpen}
          type="button"
        >
          <Eye aria-hidden="true" className="size-4" />
          Ver detalhes
        </button>
      </div>
    </article>
  );
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

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-app p-2">
      <span className="block">{label}</span>
      <strong className="block text-app-text">{value}</strong>
    </div>
  );
}

function formatPrice(priceCents: number | null) {
  if (priceCents === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(priceCents / 100);
}

function formatMileage(mileageKm: number | null) {
  if (mileageKm === null) return "-";
  return `${new Intl.NumberFormat("pt-BR").format(mileageKm)} km`;
}
