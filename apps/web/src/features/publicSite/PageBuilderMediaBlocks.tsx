import { ImageIcon, MapPin, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cx } from "../../components/ui/featureShared";
import { PageBuilderPreviewEmptyState } from "./PageBuilderEmptyState";
import type { BuilderBlockProps } from "./pageBuilderRenderTypes";
import {
  boolProp,
  classForGap,
  classForTextAlign,
  mapEmbedUrl,
  mapLink,
  numberProp,
  recordArrayProp,
  textArrayProp,
  textProp,
} from "./pageBuilderRenderUtils";

export function GalleryBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const images = recordArrayProp(props.images).filter((image) =>
    textProp(image.url),
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const columns = numberProp(props.columns, 3);
  if (!images.length) {
    return context.preview ? (
      <PageBuilderPreviewEmptyState
        icon={ImageIcon}
        title="Galeria sem imagens"
        text="Adicione fotos do estoque, showroom ou entrega para ativar o mosaico."
      />
    ) : null;
  }
  const layout = textProp(props.layout) ?? "grid";
  const gapClass = classForGap(props.gap);
  return (
    <section className="bg-panel">
      <div className="public-storefront-shell px-4 py-16 md:px-6 md:py-20">
        <BlockHeading props={props} />
        <div
          className={cx(
            "mt-10",
            layout === "carousel"
              ? "flex snap-x snap-mandatory overflow-x-auto pb-3"
              : "grid",
            layout === "carousel" ? carouselGapClass(props.gap) : gapClass,
            layout === "mosaic"
              ? "grid-cols-1 sm:grid-cols-4"
              : layout === "grid" && galleryColumnsClass(columns),
          )}
        >
          {images.map((image, index) => (
            <button
              className={cx(
                "group overflow-hidden rounded-xl border border-line bg-app text-left shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-300 hover:-translate-y-1 hover:border-accent/20 hover:shadow-[0_12px_24px_rgba(15,23,42,0.05)] cursor-pointer",
                layout === "carousel" &&
                  "min-w-[78%] snap-start sm:min-w-[42%] lg:min-w-[31%]",
                layout === "mosaic" &&
                  index % 5 === 0 &&
                  "sm:col-span-2 sm:row-span-2",
              )}
              key={textProp(image.id) ?? `${index}`}
              onClick={() =>
                boolProp(props.lightboxEnabled, true) && setSelectedIndex(index)
              }
              type="button"
            >
              <div className="overflow-hidden aspect-square">
                <img
                  alt={textProp(image.alt) ?? ""}
                  className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  src={textProp(image.url) ?? ""}
                />
              </div>
              {boolProp(props.showCaptions, true) && textProp(image.caption) ? (
                <span className="block p-5 text-xs font-bold uppercase tracking-wider text-muted border-t border-line/60">
                  {textProp(image.caption)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      {selectedIndex !== null ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-app-text/90 p-4 backdrop-blur-sm">
          <button
            aria-label="Fechar imagem"
            className="absolute right-6 top-6 rounded-full bg-panel p-3 text-app-text border border-line shadow-lg transition-transform hover:scale-105 active:scale-95"
            onClick={() => setSelectedIndex(null)}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <img
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain border border-line/10 shadow-2xl"
            src={textProp(images[selectedIndex]?.url) ?? ""}
          />
        </div>
      ) : null}
    </section>
  );
}

export function TestimonialsBlock({ component }: BuilderBlockProps) {
  const testimonials = recordArrayProp(component.props.testimonials);
  if (!testimonials.length) return null;
  return (
    <section className="bg-app">
      <div className="public-storefront-shell px-4 py-16 md:px-6 md:py-20">
        <BlockHeading props={component.props} />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {testimonials.map((item, index) => (
            <article
              className="public-editorial-card rounded-xl p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/20 hover:shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
              key={textProp(item.id) ?? `${index}`}
            >
              <div className="flex gap-1 text-accent">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    aria-hidden="true"
                    className="size-4 fill-current"
                  />
                ))}
              </div>
              <p className="mt-5 text-base font-semibold leading-relaxed text-app-text italic">
                "{textProp(item.quote) ?? ""}"
              </p>
              <div className="mt-6 flex flex-col">
                <strong className="text-sm font-bold text-app-text">
                  {textProp(item.name) ?? "Cliente"}
                </strong>
                {textProp(item.role) ? (
                  <span className="text-xs font-semibold text-muted mt-0.5">
                    {textProp(item.role)}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MapBlock({ component, context }: BuilderBlockProps) {
  const address =
    textProp(component.props.address) ?? context.config.contact.address;
  const zoom = numberProp(component.props.zoom, 15);
  if (!address) {
    return context.preview ? (
      <PageBuilderPreviewEmptyState
        icon={MapPin}
        title="Mapa sem endereco"
        text="Informe o endereco da loja para exibir a rota publica."
      />
    ) : null;
  }
  return (
    <section className="bg-panel px-4 py-8 md:px-6">
      <div className="public-storefront-shell overflow-hidden rounded-xl border border-line bg-panel shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
        <iframe
          className="aspect-[16/7] min-h-72 w-full border-0 bg-app"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={mapEmbedUrl(address, zoom)}
          title={`Mapa: ${address}`}
        />
        <a
          className="block p-6 transition-colors hover:bg-app"
          href={mapLink(address)}
          rel="noreferrer"
          target="_blank"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">
            LOCALIZAÇÃO
          </p>
          <p className="mt-2 text-xl font-extrabold tracking-tight text-app-text">
            {address}
          </p>
          <p className="mt-3 text-xs font-bold text-muted underline">
            Ver rotas no Google Maps →
          </p>
        </a>
      </div>
    </section>
  );
}

export function MarqueeBlock({ component }: BuilderBlockProps) {
  const duration = { fast: "14s", normal: "24s", slow: "36s" }[
    textProp(component.props.speed) ?? "normal"
  ];
  const reverse = textProp(component.props.direction) === "right";
  return (
    <div className="overflow-hidden border-y border-line bg-panel py-5">
      <div
        className={cx(
          "page-builder-marquee-track",
          reverse && "page-builder-marquee-track--reverse",
        )}
        style={{ animationDuration: duration }}
      >
        <span className="mx-12 text-xs font-black uppercase tracking-[0.3em] text-app-text">
          {textProp(component.props.text) ?? ""}
        </span>
        <span className="mx-12 text-xs font-black uppercase tracking-[0.3em] text-app-text">
          {textProp(component.props.text) ?? ""}
        </span>
        <span className="mx-12 text-xs font-black uppercase tracking-[0.3em] text-app-text">
          {textProp(component.props.text) ?? ""}
        </span>
        <span className="mx-12 text-xs font-black uppercase tracking-[0.3em] text-app-text">
          {textProp(component.props.text) ?? ""}
        </span>
      </div>
    </div>
  );
}

export function TypewriterBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const texts = useMemo(
    () => textArrayProp(props.texts).filter(Boolean),
    [props.texts],
  );
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const current = texts[index] ?? "";
  useEffect(() => {
    if (!current) return undefined;
    const done = length >= current.length;
    const timeout = window.setTimeout(
      () => {
        if (done) {
          setLength(0);
          setIndex((valueIndex) => (valueIndex + 1) % texts.length);
        } else {
          setLength((valueLength) => valueLength + 1);
        }
      },
      done ? numberProp(props.waitTime, 1800) : numberProp(props.speed, 70),
    );
    return () => window.clearTimeout(timeout);
  }, [current, length, props.speed, props.waitTime, texts.length]);
  return (
    <section
      className={cx(
        "bg-panel px-4 py-16 md:px-6 md:py-20",
        classForTextAlign(props.textPosition),
      )}
    >
      {textProp(props.preText) ? (
        <p className="text-sm font-bold uppercase tracking-wider text-muted">
          {textProp(props.preText)}
        </p>
      ) : null}
      <p
        className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl lg:text-6xl"
        style={{ color: context.accent }}
      >
        {current.slice(0, length)}
        {boolProp(props.showCursor, true) ? (
          <span className="page-builder-typewriter-cursor select-none">
            {textProp(props.cursorChar) ?? "|"}
          </span>
        ) : null}
      </p>
      {textProp(props.postText) ? (
        <p className="mt-4 text-sm font-bold uppercase tracking-wider text-muted">
          {textProp(props.postText)}
        </p>
      ) : null}
    </section>
  );
}

function BlockHeading({ props }: { props: Record<string, unknown> }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">
        DESTAQUE
      </p>
      <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
        {textProp(props.title) ?? "Seção"}
      </h2>
      {textProp(props.subtitle) ? (
        <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-muted">
          {textProp(props.subtitle)}
        </p>
      ) : null}
    </div>
  );
}

function galleryColumnsClass(columns: number) {
  if (columns <= 1) return "grid-cols-1";
  if (columns === 2) return "grid-cols-2";
  if (columns >= 4) return "grid-cols-2 sm:grid-cols-4";
  return "grid-cols-1 sm:grid-cols-3";
}

function carouselGapClass(value: unknown) {
  const gap = textProp(value) ?? "md";
  if (gap === "sm") return "gap-2";
  if (gap === "lg") return "gap-5";
  if (gap === "xl") return "gap-7";
  return "gap-3";
}
