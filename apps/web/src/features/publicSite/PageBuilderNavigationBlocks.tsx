import { CarFront } from "lucide-react";
import { cx } from "../../components/ui/featureShared";
import type { BuilderBlockProps } from "./pageBuilderRenderTypes";
import {
  boolProp,
  formatPrice,
  numberProp,
  recordArrayProp,
  textProp,
} from "./pageBuilderRenderUtils";
import { splitVehicleTitle } from "./publicVehicleFormatters";

export function HeaderBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const links = recordArrayProp(props.links);
  const socialLinks = Object.entries(context.config.socialLinks).filter(
    ([, url]) => Boolean(url),
  );
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
        {boolProp(props.showSocial, true) && socialLinks.length ? (
          <nav className="hidden items-center gap-3 text-xs font-black uppercase tracking-wider text-muted lg:flex">
            {socialLinks.slice(0, 3).map(([name, url]) => (
              <a
                className="transition-colors hover:text-accent"
                href={url ?? "#"}
                key={name}
                rel="noreferrer"
                target="_blank"
              >
                {name}
              </a>
            ))}
          </nav>
        ) : null}
        {boolProp(props.showContactButton, true) ? (
          <a
            className="inline-flex min-h-10 shrink-0 items-center rounded-xl px-5 text-xs font-bold uppercase tracking-wider text-inverse transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-95 cursor-pointer"
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
              <p className="text-xs font-black uppercase tracking-[0.24em] text-app-text">
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
              <p className="text-xs font-black uppercase tracking-[0.24em] text-app-text">
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
        <p className="text-xs font-black uppercase tracking-[0.26em] text-accent">
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

        {context.vehicles.length === 0 ? (
          <div className="mt-10 grid min-h-48 place-items-center rounded-xl border border-dashed border-line bg-panel p-8 text-center">
            <div>
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                <CarFront aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-black text-app-text">
                Estoque em atualização
              </h3>
              <p className="mt-2 max-w-sm text-sm font-semibold text-muted">
                Publique veículos para preencher este bloco automaticamente.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {context.vehicles.slice(0, limit).map((vehicle) => {
              const { brand, restTitle } = splitVehicleTitle(vehicle.title);
              return (
                <article
                  className="group flex flex-col justify-between overflow-hidden rounded-xl border border-line bg-panel shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                  key={vehicle.slug}
                >
                  <div>
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-app border-b border-line/60">
                      {vehicle.thumbnailUrl ? (
                        <img
                          alt=""
                          className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                          src={vehicle.thumbnailUrl}
                        />
                      ) : null}
                      <span className="absolute left-3 top-3 rounded bg-panel/95 backdrop-blur-sm border border-line px-2 py-0.5 text-xs font-black uppercase tracking-wider text-accent shadow-sm">
                        Disponível
                      </span>
                    </div>

                    <div className="p-5">
                      <h3 className="text-base font-extrabold leading-snug tracking-tight text-app-text transition-colors group-hover:text-accent">
                        <span className="text-app-text">{brand}</span>
                        {restTitle && (
                          <span className="font-medium text-muted ml-1.5">
                            {restTitle}
                          </span>
                        )}
                      </h3>
                      <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted">
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
                        <span className="uppercase opacity-80">Disponível</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-0">
                    <div className="mb-2 border-t border-line/60 pt-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-wider text-muted/80">
                          Preço sugerido
                        </span>
                        <p
                          className="text-lg font-black tracking-tight"
                          style={{ color: context.accent }}
                        >
                          {formatPrice(vehicle.priceCents)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
