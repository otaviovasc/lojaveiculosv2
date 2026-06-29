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
        "rounded-lg border border-line bg-panel/95 backdrop-blur",
      )}
    >
      <div className="flex min-h-16 items-center justify-between gap-3 px-4">
        <strong className="truncate text-base font-black">{logoText}</strong>
        <nav className="hidden min-w-0 items-center gap-3 text-sm font-black text-muted md:flex">
          {links.map((link, index) => (
            <a
              href={textProp(link.href) ?? "#"}
              key={`${textProp(link.title)}_${index}`}
            >
              {textProp(link.title) ?? "Link"}
            </a>
          ))}
        </nav>
        {boolProp(props.showContactButton, true) ? (
          <a
            className="inline-flex min-h-10 shrink-0 items-center rounded-lg px-3 text-sm font-black text-inverse"
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
    <footer className="rounded-lg border border-line bg-panel p-5">
      <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <div>
          <strong className="text-xl font-black">
            {context.config.storeName}
          </strong>
          <p className="mt-2 text-sm font-bold text-muted">
            Atendimento direto, estoque publicado e canais oficiais da loja.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {columns.map((column, index) => (
            <div key={`${textProp(column.label)}_${index}`}>
              <p className="text-xs font-black uppercase tracking-widest text-muted">
                {textProp(column.label) ?? "Links"}
              </p>
              <div className="mt-2 grid gap-2 text-sm font-bold">
                {recordArrayProp(column.links).map((link, linkIndex) => (
                  <a
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
              <p className="text-xs font-black uppercase tracking-widest text-muted">
                Redes
              </p>
              <div className="mt-2 grid gap-2 text-sm font-bold">
                {socialLinks.map(([name, url]) => (
                  <a href={url ?? "#"} key={name}>
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
    <section
      className="rounded-lg border border-line bg-panel p-5"
      id="estoque"
    >
      <h2 className="text-xl font-black">
        {textProp(props.title) ?? "Estoque em destaque"}
      </h2>
      {textProp(props.subtitle) ? (
        <p className="mt-1 text-sm font-bold text-muted">
          {textProp(props.subtitle)}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {context.vehicles.slice(0, limit).map((vehicle) => (
          <article
            className="overflow-hidden rounded-lg border border-line bg-app"
            key={vehicle.slug}
          >
            <div className="aspect-[16/10] bg-accent-soft">
              {vehicle.thumbnailUrl ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  src={vehicle.thumbnailUrl}
                />
              ) : null}
            </div>
            <div className="p-4">
              <h3 className="font-black">{vehicle.title}</h3>
              <p className="mt-1 text-sm font-bold text-muted">
                {vehicle.modelYear ?? vehicle.manufactureYear ?? ""}
                {vehicle.mileageKm !== null && vehicle.mileageKm !== undefined
                  ? ` · ${vehicle.mileageKm.toLocaleString("pt-BR")} km`
                  : ""}
              </p>
              <p
                className="mt-3 text-lg font-black"
                style={{ color: context.accent }}
              >
                {formatPrice(vehicle.priceCents)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
