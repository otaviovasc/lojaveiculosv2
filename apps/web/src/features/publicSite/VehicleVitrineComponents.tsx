import { ArrowRight, Camera, Car } from "lucide-react";
import { useEffect, useState } from "react";
import type { BuilderBlockProps } from "./pageBuilderRenderTypes";
import { textProp } from "./pageBuilderRenderUtils";
import {
  extractCommercialCondition,
  hasVitrineContact,
  hasVitrineGallery,
  hasVitrineSpecs,
} from "./vehicleVitrineContent";

export function VehicleVitrineImage({
  alt,
  src,
  className = "aspect-[16/10] w-full object-cover",
}: {
  alt: string;
  src?: string | null;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) {
    return (
      <div
        className={`vehicle-vitrine-image-fallback flex flex-col items-center justify-center gap-3 rounded-xl border border-line bg-app p-6 text-center text-muted ${className}`}
        role="img"
        aria-label={`${alt}: foto indisponível`}
      >
        <Car aria-hidden="true" className="size-8" />
        <p className="text-sm font-bold">Foto indisponível</p>
        <p className="text-xs">Peça mais fotos à loja.</p>
      </div>
    );
  }
  return (
    <img
      alt={alt}
      className={className}
      onError={() => setFailedSource(src)}
      src={src}
    />
  );
}

export function VehicleVitrineHero({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const imageAlt =
    textProp(props.imageAlt) ?? textProp(props.title) ?? "Veículo";
  const ctaUrl = textProp(props.ctaUrl) ?? "#contato";
  const ctaLabel =
    textProp(props.ctaLabel) ??
    textProp(props.primaryLabel) ??
    "Falar com a loja";
  const { commercialCondition, description } = extractCommercialCondition(
    textProp(props.subtitle),
  );
  const hasGallery = hasVitrineGallery(context.allComponents);
  const hasSpecs = hasVitrineSpecs(context.allComponents);
  const hasContact = hasVitrineContact(context.allComponents);
  const badge = textProp(props.badge) ?? textProp(props.eyebrow);
  return (
    <section className="vehicle-vitrine-hero bg-panel" id="home">
      <div className="public-storefront-shell grid gap-8 px-4 py-8 md:px-6 md:py-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className="vehicle-vitrine-summary flex min-w-0 flex-col justify-center">
          {badge ? (
            <p className="vehicle-vitrine-eyebrow text-xs font-bold uppercase tracking-wider text-muted">
              {badge}
            </p>
          ) : null}
          <h1 className="mt-3 break-words text-3xl font-extrabold leading-[1.1] tracking-tight text-app-text sm:text-4xl lg:text-5xl">
            {textProp(props.title) ?? context.config.storeName}
          </h1>
          {commercialCondition ? (
            <div className="vehicle-vitrine-condition mt-5 border-l-2 border-accent pl-4">
              <span className="block text-xs font-semibold text-muted">
                {commercialCondition.startsWith("R$")
                  ? "Valor do veículo"
                  : "Condição comercial"}
              </span>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-app-text sm:text-3xl tabular-nums">
                {commercialCondition}
              </p>
            </div>
          ) : null}
          {description ? (
            <p className="mt-5 max-w-xl text-sm font-medium leading-relaxed text-muted sm:text-base">
              {description}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {hasContact || ctaUrl !== "#contato" ? (
              <a
                className="vehicle-vitrine-primary inline-flex min-h-12 items-center justify-center gap-2 rounded bg-accent px-6 text-sm font-bold text-accent-foreground transition-transform active:scale-95"
                href={ctaUrl}
              >
                {ctaLabel}
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            ) : null}
            {hasSpecs ? (
              <a
                className="inline-flex min-h-12 items-center justify-center rounded border border-line px-4 text-sm font-semibold text-app-text"
                href="#specs"
              >
                Ficha técnica
              </a>
            ) : null}
            {hasGallery ? (
              <a
                className="inline-flex min-h-12 items-center justify-center gap-2 text-sm font-semibold text-app-text underline underline-offset-4"
                href="#gallery"
              >
                <Camera aria-hidden="true" className="size-4" />
                Ver fotos
              </a>
            ) : null}
          </div>
        </div>
        <div className="vehicle-vitrine-media-column flex min-w-0 flex-col gap-3">
          <div className="relative overflow-hidden rounded-xl border border-line bg-app">
            <VehicleVitrineImage
              alt={imageAlt}
              src={textProp(props.imageUrl)}
            />
          </div>
          {hasGallery ? (
            <a
              className="inline-flex min-h-10 items-center justify-between gap-2 text-sm font-semibold text-app-text"
              href="#gallery"
            >
              <span>Veja as fotos do veículo</span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function VehicleVitrineMobileDock({
  ctaLabel = "Falar com a loja",
  ctaUrl = "#contato",
  priceOrCondition,
  title,
}: {
  ctaLabel?: string;
  ctaUrl?: string;
  priceOrCondition?: string | null;
  title: string;
}) {
  const [contactVisible, setContactVisible] = useState(false);
  useEffect(() => {
    if (ctaUrl !== "#contato" || typeof IntersectionObserver === "undefined")
      return;
    const contact = document.getElementById("contato");
    if (!contact) return;
    const observer = new IntersectionObserver(([entry]) =>
      setContactVisible(entry?.isIntersecting ?? false),
    );
    observer.observe(contact);
    return () => observer.disconnect();
  }, [ctaUrl]);
  if (contactVisible) return null;
  return (
    <aside
      aria-label="Ações rápidas do veículo"
      className="vehicle-vitrine-mobile-dock fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-line bg-panel px-4 py-3 md:hidden"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-muted">{title}</p>
        {priceOrCondition ? (
          <p className="text-sm font-bold text-app-text">{priceOrCondition}</p>
        ) : null}
      </div>
      <a
        className="inline-flex min-h-11 max-w-40 shrink-0 items-center justify-center gap-2 rounded bg-accent px-4 text-center text-xs font-bold text-accent-foreground"
        href={ctaUrl}
      >
        {ctaLabel}
        <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
      </a>
    </aside>
  );
}
