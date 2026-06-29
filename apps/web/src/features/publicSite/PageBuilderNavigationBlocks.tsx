import { cx } from "../../components/ui/featureShared";
import type { BuilderBlockProps } from "./pageBuilderRenderTypes";
import {
  boolProp,
  formatPrice,
  numberProp,
  recordArrayProp,
  textProp,
} from "./pageBuilderRenderUtils";

export function HeaderBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const links = recordArrayProp(props.links);
  const logoText = textProp(props.logoText) ?? context.config.storeName;
  return (
    <header
      className={cx(
        boolProp(props.sticky, true) && "sticky top-0 z-20",
        "border-b border-line bg-panel/90 shadow-[0_8px_30px_rgba(15,23,42,0.03)] backdrop-blur-xl",
      )}
    >
      <div className="public-storefront-shell flex min-h-16 items-center justify-between gap-4 px-4 md:px-6">
        <strong className="truncate text-base font-extrabold tracking-tight text-app-text">
          {logoText}
        </strong>
        <nav className="hidden min-w-0 items-center gap-6 text-xs font-bold uppercase tracking-wider text-muted md:flex">
          {links.map((link, index) => (
            <a
              className="transition-colors hover:text-accent"
              href={textProp(link.href) ?? "#"}
              key={`${textProp(link.title)}_${index}`}
            >
              {textProp(link.title) ?? "Link"}
            </a>
          ))}
        </nav>
        {boolProp(props.showContactButton, true) ? (
          <a
            className="inline-flex min-h-10 shrink-0 items-center rounded-full px-5 text-xs font-bold uppercase tracking-wider text-inverse shadow-[0_6px_20px_color-mix(in_oklab,var(--color-accent)_16%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-95"
            href={textProp(props.contactButtonLink) ?? "#contato"}
            style={{ background: context.accent }}
          >
            {textProp(props.contactButtonText) ?? "Contato"}
          </a>
        ) : null}
      </div>
    </header>
  );
}

export function FooterBlock({ component, context }: BuilderBlockProps) {
  const columns = recordArrayProp(component.props.columns);
  const socialLinks = Object.entries(context.config.socialLinks).filter(
    ([, url]) => Boolean(url),
  );
  return (
    <footer className="border-t border-line bg-panel">
      <div className="public-storefront-shell grid gap-8 px-4 py-12 md:grid-cols-[1.3fr_1fr] md:px-6">
        <div>
          <strong className="text-lg font-extrabold tracking-tight text-app-text">
            {context.config.storeName}
          </strong>
          <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-muted">
            Atendimento direto, estoque publicado e canais oficiais da loja.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {columns.map((column, index) => (
            <div key={`${textProp(column.label)}_${index}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-app-text">
                {textProp(column.label) ?? "Links"}
              </p>
              <div className="mt-4 grid gap-2.5 text-xs font-bold text-muted">
                {recordArrayProp(column.links).map((link, linkIndex) => (
                  <a
                    className="transition-colors hover:text-accent"
                    href={textProp(link.href) ?? "#"}
                    key={`${textProp(link.title)}_${linkIndex}`}
                  >
                    {textProp(link.title) ?? "Link"}
                  </a>
                ))}
              </div>
            </div>
          ))}
          {boolProp(component.props.showSocial, true) && socialLinks.length ? (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-app-text">
                Redes Sociais
              </p>
              <div className="mt-4 grid gap-2.5 text-xs font-bold text-muted">
                {socialLinks.map(([name, url]) => (
                  <a
                    className="transition-colors hover:text-accent uppercase"
                    href={url ?? "#"}
                    key={name}
                  >
                    {name}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

export function VehicleGridBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const limit = numberProp(props.maxProperties ?? props.limit, 6);
  return (
    <section className="bg-app" id="estoque">
      <div className="public-storefront-shell px-4 py-16 md:px-6 md:py-20">
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">
          CATÁLOGO
        </p>
        <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
          {textProp(props.title) ?? "Estoque em destaque"}
        </h2>
        {textProp(props.subtitle) ? (
          <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-muted">
            {textProp(props.subtitle)}
          </p>
        ) : null}

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {context.vehicles.slice(0, limit).map((vehicle) => (
            <article
              className="group flex flex-col justify-between overflow-hidden rounded-[2rem] border border-line bg-panel shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/30 hover:shadow-[0_20px_40px_-5px_rgba(15,23,42,0.08)]"
              key={vehicle.slug}
            >
              <div>
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-accent-soft">
                  {vehicle.thumbnailUrl ? (
                    <img
                      alt=""
                      className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      src={vehicle.thumbnailUrl}
                    />
                  ) : null}
                  <span className="absolute left-4 top-4 rounded-full bg-panel/90 backdrop-blur-md border border-line px-3 py-1 text-[10px] font-black uppercase tracking-wider text-accent">
                    Disponível
                  </span>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold leading-snug tracking-tight text-app-text transition-colors group-hover:text-accent">
                    {vehicle.title}
                  </h3>
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-muted">
                    <span>
                      {vehicle.modelYear ?? vehicle.manufactureYear ?? "-"}
                    </span>
                    {vehicle.mileageKm !== null &&
                    vehicle.mileageKm !== undefined ? (
                      <>
                        <span
                          className="size-1 rounded-full bg-line-strong"
                          aria-hidden="true"
                        />
                        <span>
                          {vehicle.mileageKm.toLocaleString("pt-BR")} km
                        </span>
                      </>
                    ) : null}
                    <span
                      className="size-1 rounded-full bg-line-strong"
                      aria-hidden="true"
                    />
                    <span className="uppercase opacity-80">
                      {vehicle.slug.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-0">
                <div className="mb-2 border-t border-line/60 pt-4 flex items-baseline justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                    Preço sugerido
                  </span>
                  <p
                    className="text-xl font-extrabold tracking-tight"
                    style={{ color: context.accent }}
                  >
                    {formatPrice(vehicle.priceCents)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
