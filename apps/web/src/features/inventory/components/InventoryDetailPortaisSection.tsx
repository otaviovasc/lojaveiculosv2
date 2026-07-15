import { ExternalLink, Info } from "lucide-react";

type Props = {
  advertisedPrice: string;
  publicListingUrl: string | null;
  title: string;
};

const partnerPortals = ["Webmotors", "iCarros", "OLX", "Mercado Livre"];

export function InventoryDetailPortaisSection({
  advertisedPrice,
  publicListingUrl,
  title,
}: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-col justify-between gap-2 border-b border-line pb-3 sm:flex-row sm:items-center">
        <h3 className="text-sm font-black uppercase tracking-wider">
          Portais de publicação
        </h3>
        <span className="text-xs font-black uppercase tracking-wider text-muted">
          Veículo: {title} • {advertisedPrice}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="flex flex-col gap-3 rounded-2xl border border-line bg-app-elevated/20 p-4.5">
          <span className="self-start rounded-full border border-accent-soft/30 bg-accent-soft/20 px-2.5 py-1 text-xs font-black uppercase text-accent-strong">
            Portal próprio
          </span>
          {publicListingUrl ? (
            <>
              <p className="text-xs font-bold text-success-strong">
                Publicado no portal próprio
              </p>
              <a
                className="inline-flex items-center gap-1 text-xs font-black text-accent-strong hover:underline"
                href={publicListingUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>Visualizar anúncio</span>
                <ExternalLink className="size-3" />
              </a>
            </>
          ) : (
            <p className="text-xs font-bold text-muted">
              O link público ainda não está disponível para este cadastro.
            </p>
          )}
        </article>

        {partnerPortals.map((portal) => (
          <article
            key={portal}
            className="flex flex-col gap-3 rounded-2xl border border-line bg-app-elevated/20 p-4.5"
          >
            <span className="self-start rounded-full border border-line bg-app px-2.5 py-1 text-xs font-black uppercase text-muted">
              {portal}
            </span>
            <p className="text-xs font-bold text-muted">
              Integração não disponível nesta tela.
            </p>
          </article>
        ))}
      </div>

      <div className="flex gap-2 rounded-xl border border-line bg-app-elevated/40 p-3 text-xs font-bold text-muted">
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
