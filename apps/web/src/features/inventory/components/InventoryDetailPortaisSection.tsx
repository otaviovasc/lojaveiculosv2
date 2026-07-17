import { useState } from "react";
import { ExternalLink, Info, Share2, Store } from "lucide-react";

type Props = {
  advertisedPrice: string;
  publicListingUrl: string | null;
  title: string;
};

type PortalBrand = {
  name: string;
  short: string;
  color: string;
  slug: string;
  textColor?: string;
};

const partnerPortals: PortalBrand[] = [
  { name: "Webmotors", short: "W", color: "#143d8f", slug: "webmotors" },
  { name: "iCarros", short: "iC", color: "#ec7000", slug: "icarros" },
  { name: "OLX", short: "OLX", color: "#23e5db", slug: "olx" },
  {
    name: "Mercado Livre",
    short: "ML",
    color: "#2d3277",
    slug: "mercadolivre",
  },
];

export function InventoryDetailPortaisSection({
  advertisedPrice,
  publicListingUrl,
  title,
}: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-col justify-between gap-2 border-b border-line pb-3 sm:flex-row sm:items-center">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Share2 className="size-4" />
          </span>
          Portais de publicação
        </h3>
        <span className="text-xs font-black uppercase tracking-wider text-muted">
          Veículo: {title} • {advertisedPrice}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-panel">
          <header className="flex items-center justify-between gap-2 border-b border-line bg-accent-soft px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Store className="size-4" />
              </span>
              <strong className="truncate text-sm font-black text-app-text">
                Portal próprio
              </strong>
            </div>
            <span
              className={
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-black uppercase " +
                (publicListingUrl
                  ? "bg-green-soft text-success-strong"
                  : "bg-warning/10 text-warning-strong")
              }
            >
              {publicListingUrl ? "Publicado" : "Pendente"}
            </span>
          </header>
          <div className="p-3.5">
            {publicListingUrl ? (
              <a
                className="inline-flex items-center gap-1 text-xs font-black text-accent-strong hover:underline"
                href={publicListingUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>Visualizar anúncio</span>
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <p className="text-xs font-bold text-muted">
                O link público ainda não está disponível para este cadastro.
              </p>
            )}
          </div>
        </article>

        {partnerPortals.map((portal) => (
          <PartnerPortalCard brand={portal} key={portal.name} />
        ))}
      </div>

      <div className="flex gap-2 rounded-xl bg-app-elevated/40 p-3 text-xs font-bold text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0 text-accent" />
        <p>
          Nenhum status de parceiro é inferido localmente. Ativação e
          sincronização só serão exibidas quando houver estado confirmado pela
          integração correspondente.
        </p>
      </div>
    </section>
  );
}

function PartnerPortalCard({ brand }: { brand: PortalBrand }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-panel">
      <header
        className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5"
        style={{ backgroundColor: `${brand.color}14` }}
      >
        <PortalLogo brand={brand} />
        <span className="shrink-0 rounded-full border border-line bg-app px-2 py-0.5 text-xs font-black uppercase text-muted">
          Em breve
        </span>
      </header>
      <div className="p-3.5">
        <p className="text-xs font-bold text-muted">
          Integração não disponível nesta tela.
        </p>
      </div>
    </article>
  );
}

function PortalLogo({ brand }: { brand: PortalBrand }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-black"
          style={{
            backgroundColor: brand.color,
            color: brand.textColor ?? "#ffffff",
          }}
        >
          {brand.short}
        </span>
        <strong className="truncate text-sm font-black text-app-text">
          {brand.name}
        </strong>
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center rounded-md border border-line/60 bg-white px-2.5 py-1.5">
      <img
        alt={brand.name}
        className="h-5 w-auto max-w-[120px] object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
        src={`/icons/portals/${brand.slug}.svg`}
      />
    </span>
  );
}
