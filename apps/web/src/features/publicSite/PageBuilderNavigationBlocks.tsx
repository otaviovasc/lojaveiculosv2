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
        "border-b border-line bg-panel/80 shadow-[0_12px_34px_rgb(15_23_42_/_0.05)] backdrop-blur-xl",
      )}
    >
      <div className="public-storefront-shell flex min-h-16 items-center justify-between gap-3 px-4 md:px-6">
        <strong className="truncate text-base font-semibold tracking-tight">
          {logoText}
        </strong>
        <nav className="hidden min-w-0 items-center gap-5 text-sm font-medium text-app-text md:flex">
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
            className="inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold text-inverse shadow-[0_12px_32px_color-mix(in_oklab,var(--color-accent)_18%,transparent)] transition-[filter,transform] duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]"
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
      <div className="public-storefront-shell grid gap-8 px-4 py-10 md:grid-cols-[1.2fr_1fr] md:px-6">
        <div>
          <strong className="text-xl font-semibold tracking-tight">
            {context.config.storeName}
          </strong>
          <p className="mt-2 max-w-md text-sm font-medium leading-6 text-muted">
            Atendimento direto, estoque publicado e canais oficiais da loja.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {columns.map((column, index) => (
            <div key={`${textProp(column.label)}_${index}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                {textProp(column.label) ?? "Links"}
              </p>
              <div className="mt-3 grid gap-2 text-sm font-medium">
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Redes
              </p>
              <div className="mt-3 grid gap-2 text-sm font-medium">
                {socialLinks.map(([name, url]) => (
                  <a
                    className="transition-colors hover:text-accent"
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
      <div className="public-storefront-shell px-4 py-14 md:px-6 md:py-20">
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          {textProp(props.title) ?? "Estoque em destaque"}
        </h2>
        {textProp(props.subtitle) ? (
          <p className="mt-3 max-w-2xl text-base font-medium leading-8 text-muted">
            {textProp(props.subtitle)}
          </p>
        ) : null}
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {context.vehicles.slice(0, limit).map((vehicle) => (
            <article
              className="group overflow-hidden rounded-[1.35rem] border border-line bg-panel shadow-[0_10px_34px_rgb(15_23_42_/_0.06)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_24px_70px_rgb(15_23_42_/_0.12)]"
              key={vehicle.slug}
            >
              <div className="aspect-[16/10] bg-accent-soft">
                {vehicle.thumbnailUrl ? (
                  <img
                    alt=""
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src={vehicle.thumbnailUrl}
                  />
                ) : null}
              </div>
              <div className="p-5">
                <h3 className="font-semibold tracking-tight">
                  {vehicle.title}
                </h3>
                <p className="mt-2 text-sm font-medium text-muted">
                  {vehicle.modelYear ?? vehicle.manufactureYear ?? ""}
                  {vehicle.mileageKm !== null && vehicle.mileageKm !== undefined
                    ? ` · ${vehicle.mileageKm.toLocaleString("pt-BR")} km`
                    : ""}
                </p>
                <p
                  className="mt-4 text-xl font-semibold tracking-tight"
                  style={{ color: context.accent }}
                >
                  {formatPrice(vehicle.priceCents)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
