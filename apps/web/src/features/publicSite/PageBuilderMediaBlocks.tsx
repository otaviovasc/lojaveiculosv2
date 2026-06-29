import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cx } from "../../components/ui/featureShared";
import type { BuilderBlockProps } from "./pageBuilderRenderTypes";
import {
  boolProp,
  mapLink,
  numberProp,
  recordArrayProp,
  textArrayProp,
  textProp,
} from "./pageBuilderRenderUtils";

export function GalleryBlock({ component }: BuilderBlockProps) {
  const props = component.props;
  const images = recordArrayProp(props.images);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const columns = numberProp(props.columns, 3);
  if (!images.length) return null;
  return (
    <section className="bg-panel">
      <div className="public-storefront-shell px-4 py-14 md:px-6 md:py-20">
        <BlockHeading props={props} />
        <div className={cx("mt-8 grid gap-4", galleryColumnsClass(columns))}>
          {images.map((image, index) => (
            <button
              className="group overflow-hidden rounded-[1.35rem] bg-app text-left shadow-[0_10px_34px_rgb(15_23_42_/_0.06)] transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgb(15_23_42_/_0.12)]"
              key={textProp(image.id) ?? `${index}`}
              onClick={() =>
                boolProp(props.lightboxEnabled, true) && setSelectedIndex(index)
              }
              type="button"
            >
              <img
                alt={textProp(image.alt) ?? ""}
                className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105"
                src={textProp(image.url) ?? ""}
              />
              {boolProp(props.showCaptions, true) && textProp(image.caption) ? (
                <span className="block p-4 text-sm font-medium text-muted">
                  {textProp(image.caption)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      {selectedIndex !== null ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-app-text/80 p-4">
          <button
            aria-label="Fechar imagem"
            className="absolute right-4 top-4 rounded-lg bg-panel p-2"
            onClick={() => setSelectedIndex(null)}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <img
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
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
      <div className="public-storefront-shell px-4 py-14 md:px-6 md:py-20">
        <BlockHeading props={component.props} />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {testimonials.map((item, index) => (
            <article
              className="rounded-[1.5rem] border border-line bg-panel p-6 shadow-[0_10px_34px_rgb(15_23_42_/_0.06)] transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgb(15_23_42_/_0.1)]"
              key={textProp(item.id) ?? `${index}`}
            >
              <p className="text-base font-medium leading-8 text-muted">
                "{textProp(item.quote) ?? ""}"
              </p>
              <strong className="mt-4 block font-semibold text-app-text">
                {textProp(item.name) ?? "Cliente"}
              </strong>
              {textProp(item.role) ? (
                <span className="text-sm font-medium text-muted">
                  {textProp(item.role)}
                </span>
              ) : null}
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
  if (!address) return null;
  return (
    <a
      className="public-storefront-shell block rounded-[1.5rem] border border-line bg-panel p-6 shadow-[0_10px_34px_rgb(15_23_42_/_0.06)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_24px_70px_rgb(15_23_42_/_0.1)]"
      href={mapLink(address)}
      rel="noreferrer"
      target="_blank"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
        Endereco
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{address}</p>
    </a>
  );
}

export function MarqueeBlock({ component }: BuilderBlockProps) {
  const duration = { fast: "14s", normal: "24s", slow: "36s" }[
    textProp(component.props.speed) ?? "normal"
  ];
  const reverse = textProp(component.props.direction) === "right";
  return (
    <div className="overflow-hidden border-y border-line bg-panel py-4">
      <div
        className={cx(
          "page-builder-marquee-track",
          reverse && "page-builder-marquee-track--reverse",
        )}
        style={{ animationDuration: duration }}
      >
        <span className="mx-8 text-sm font-semibold uppercase tracking-[0.24em] text-muted">
          {textProp(component.props.text) ?? ""}
        </span>
        <span className="mx-8 text-sm font-semibold uppercase tracking-[0.24em] text-muted">
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
    <section className="bg-panel px-4 py-14 text-center md:px-6 md:py-20">
      {textProp(props.preText) ? (
        <p className="text-xl font-medium text-muted">
          {textProp(props.preText)}
        </p>
      ) : null}
      <p
        className="mt-2 text-4xl font-semibold tracking-tight md:text-6xl"
        style={{ color: context.accent }}
      >
        {current.slice(0, length)}
        {boolProp(props.showCursor, true) ? (
          <span className="page-builder-typewriter-cursor">
            {textProp(props.cursorChar) ?? "|"}
          </span>
        ) : null}
      </p>
      {textProp(props.postText) ? (
        <p className="mt-3 text-xl font-medium text-muted">
          {textProp(props.postText)}
        </p>
      ) : null}
    </section>
  );
}

function BlockHeading({ props }: { props: Record<string, unknown> }) {
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
        {textProp(props.title) ?? "Secao"}
      </h2>
      {textProp(props.subtitle) ? (
        <p className="mt-3 max-w-2xl text-base font-medium leading-8 text-muted">
          {textProp(props.subtitle)}
        </p>
      ) : null}
    </>
  );
}

function galleryColumnsClass(columns: number) {
  if (columns <= 1) return "md:grid-cols-1";
  if (columns === 2) return "md:grid-cols-2";
  if (columns >= 4) return "md:grid-cols-4";
  return "md:grid-cols-3";
}
