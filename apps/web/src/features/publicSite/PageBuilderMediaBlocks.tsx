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
    <section className="rounded-lg border border-line bg-panel p-5 shadow-sm lg:p-7">
      <BlockHeading props={props} />
      <div className={cx("mt-4 grid gap-3", galleryColumnsClass(columns))}>
        {images.map((image, index) => (
          <button
            className="group overflow-hidden rounded-lg border border-line bg-app text-left transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_color-mix(in_oklab,var(--color-text)_10%,transparent)]"
            key={textProp(image.id) ?? `${index}`}
            onClick={() =>
              boolProp(props.lightboxEnabled, true) && setSelectedIndex(index)
            }
            type="button"
          >
            <img
              alt={textProp(image.alt) ?? ""}
              className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
              src={textProp(image.url) ?? ""}
            />
            {boolProp(props.showCaptions, true) && textProp(image.caption) ? (
              <span className="block p-3 text-sm font-bold text-muted">
                {textProp(image.caption)}
              </span>
            ) : null}
          </button>
        ))}
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
    <section className="rounded-lg border border-line bg-panel p-5 shadow-sm lg:p-7">
      <BlockHeading props={component.props} />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {testimonials.map((item, index) => (
          <article
            className="rounded-lg border border-line bg-app p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_color-mix(in_oklab,var(--color-text)_10%,transparent)]"
            key={textProp(item.id) ?? `${index}`}
          >
            <p className="text-sm font-bold leading-6 text-muted">
              "{textProp(item.quote) ?? ""}"
            </p>
            <strong className="mt-3 block font-black">
              {textProp(item.name) ?? "Cliente"}
            </strong>
            {textProp(item.role) ? (
              <span className="text-sm font-bold text-muted">
                {textProp(item.role)}
              </span>
            ) : null}
          </article>
        ))}
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
      className="rounded-lg border border-line bg-panel p-5 shadow-sm transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_14px_36px_color-mix(in_oklab,var(--color-text)_10%,transparent)]"
      href={mapLink(address)}
      rel="noreferrer"
      target="_blank"
    >
      <p className="text-xs font-black uppercase tracking-widest text-muted">
        Endereco
      </p>
      <p className="mt-2 text-lg font-black">{address}</p>
    </a>
  );
}

export function MarqueeBlock({ component }: BuilderBlockProps) {
  const duration = { fast: "14s", normal: "24s", slow: "36s" }[
    textProp(component.props.speed) ?? "normal"
  ];
  const reverse = textProp(component.props.direction) === "right";
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel py-3 shadow-sm">
      <div
        className={cx(
          "page-builder-marquee-track",
          reverse && "page-builder-marquee-track--reverse",
        )}
        style={{ animationDuration: duration }}
      >
        <span className="mx-6 text-sm font-black uppercase tracking-widest">
          {textProp(component.props.text) ?? ""}
        </span>
        <span className="mx-6 text-sm font-black uppercase tracking-widest">
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
    <section className="rounded-lg border border-line bg-panel p-8 text-center shadow-sm">
      {textProp(props.preText) ? (
        <p className="text-xl font-black text-muted">
          {textProp(props.preText)}
        </p>
      ) : null}
      <p
        className="mt-2 text-3xl font-black md:text-5xl"
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
        <p className="mt-2 text-xl font-black text-muted">
          {textProp(props.postText)}
        </p>
      ) : null}
    </section>
  );
}

function BlockHeading({ props }: { props: Record<string, unknown> }) {
  return (
    <>
      <h2 className="text-xl font-black">{textProp(props.title) ?? "Secao"}</h2>
      {textProp(props.subtitle) ? (
        <p className="mt-1 text-sm font-bold text-muted">
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
