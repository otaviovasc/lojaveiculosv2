import { ArrowRight, Sparkles } from "lucide-react";
import { cx } from "../../components/ui/featureShared";
import type { BuilderBlockProps } from "./pageBuilderRenderTypes";
import {
  boolProp,
  classForMaxWidth,
  classForTextAlign,
  createWhatsappHref,
  textProp,
  youtubeEmbedUrl,
} from "./pageBuilderRenderUtils";

export function HeroBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const imageUrl = textProp(props.imageUrl) ?? context.config.heroImageUrl;
  const ctaUrl = textProp(props.ctaUrl) ?? "#estoque";
  return (
    <section className="bg-panel" id="home">
      <div className="public-storefront-shell grid gap-10 px-4 py-16 md:px-6 md:py-20 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-accent">
            <Sparkles aria-hidden="true" className="size-3.5" />
            {textProp(props.badge) ??
              textProp(props.eyebrow) ??
              "CONCESSIONÁRIA"}
          </p>
          <h1 className="mt-5 max-w-3xl break-words text-4xl font-extrabold leading-[1.05] tracking-tight text-app-text sm:text-5xl lg:text-6xl">
            {textProp(props.title) ?? context.config.storeName}
          </h1>
          <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-muted sm:text-lg">
            {textProp(props.subtitle) ??
              "Atendimento direto e estoque publicado pela loja."}
          </p>
          <a
            className="group mt-8 inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-full px-8 text-sm font-bold text-inverse shadow-[0_8px_30px_color-mix(in_oklab,var(--color-accent)_20%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_color-mix(in_oklab,var(--color-accent)_32%,transparent)] active:translate-y-0 active:scale-95"
            href={ctaUrl}
            style={{ background: context.accent }}
          >
            {textProp(props.ctaLabel) ??
              textProp(props.primaryLabel) ??
              "Ver estoque"}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </a>
        </div>
        {imageUrl ? (
          <div className="overflow-hidden rounded-[2rem] border border-line bg-app shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <img
              alt={textProp(props.imageAlt) ?? ""}
              className="aspect-[16/11] w-full object-cover transition-transform duration-700 hover:scale-[1.025]"
              src={imageUrl}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function AboutBlock({ component }: BuilderBlockProps) {
  const props = component.props;
  const imageUrl = textProp(props.imageUrl);
  const imageLeft = textProp(props.imagePosition) === "left";
  const textContent = (
    <div className="flex min-w-0 flex-col justify-center">
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">
        SOBRE A LOJA
      </p>
      <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
        {textProp(props.title) ?? "Sobre a loja"}
      </h2>
      <p className="mt-6 whitespace-pre-wrap text-base font-medium leading-relaxed text-muted">
        {textProp(props.text) ?? ""}
      </p>
    </div>
  );
  const imageContent = imageUrl ? (
    <div className="overflow-hidden rounded-[2rem] border border-line bg-panel shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
      <img
        alt=""
        className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.025]"
        src={imageUrl}
      />
    </div>
  ) : null;
  return (
    <section className="bg-app">
      <div className="public-storefront-shell grid gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-20">
        {imageLeft ? imageContent : textContent}
        {imageLeft ? textContent : imageContent}
      </div>
    </section>
  );
}

export function TextBlock({ component }: BuilderBlockProps) {
  const props = component.props;
  return (
    <section
      className={cx(
        classForMaxWidth(props.maxWidth),
        "mx-auto w-full px-4 py-12 md:px-6 md:py-16",
        classForTextAlign(props.alignment),
      )}
    >
      <p className="mx-auto max-w-3xl whitespace-pre-wrap text-base font-medium leading-relaxed text-muted sm:text-lg">
        {textProp(props.content) ??
          textProp(props.text) ??
          textProp(props.body) ??
          ""}
      </p>
    </section>
  );
}

export function CtaBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const href =
    textProp(props.buttonUrl) ??
    textProp(props.ctaUrl) ??
    createWhatsappHref(context.config.contact.whatsapp ?? "");
  return (
    <section className="bg-panel">
      <div className="public-storefront-shell px-4 py-16 text-center md:px-6 md:py-20">
        <div className="rounded-[2.5rem] border border-line bg-app p-8 shadow-[0_12px_40px_rgba(15,23,42,0.02)] md:p-14">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
            {textProp(props.title) ?? "Quer ajuda para escolher?"}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-relaxed text-muted">
            {textProp(props.subtitle) ??
              textProp(props.text) ??
              "Converse com a equipe comercial da loja."}
          </p>
          <a
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-8 text-sm font-bold text-inverse shadow-[0_8px_30px_color-mix(in_oklab,var(--color-accent)_20%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_color-mix(in_oklab,var(--color-accent)_32%,transparent)] active:translate-y-0 active:scale-95"
            href={href}
            style={{ background: context.accent }}
          >
            {textProp(props.buttonLabel) ??
              textProp(props.label) ??
              "Chamar no WhatsApp"}
          </a>
        </div>
      </div>
    </section>
  );
}

export function ImageBlock({ component }: BuilderBlockProps) {
  const props = component.props;
  const imageUrl = textProp(props.imageUrl) ?? textProp(props.url);
  if (!imageUrl) return null;
  return (
    <figure className="group public-storefront-shell overflow-hidden rounded-[2rem] border border-line bg-panel shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
      <img
        alt={textProp(props.alt) ?? textProp(props.caption) ?? ""}
        className="max-h-[36rem] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        src={imageUrl}
      />
      {textProp(props.caption) ? (
        <figcaption className="border-t border-line/60 p-4 text-xs font-bold uppercase tracking-wider text-muted">
          {textProp(props.caption)}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function VideoBlock({ component }: BuilderBlockProps) {
  const props = component.props;
  const videoUrl = textProp(props.videoUrl) ?? textProp(props.url);
  if (!videoUrl) return null;
  const embedUrl = youtubeEmbedUrl(videoUrl);
  return (
    <section className="public-storefront-shell overflow-hidden rounded-[2rem] border border-line bg-panel shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
      {embedUrl ? (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full border-0"
          src={embedUrl}
          title="Video"
        />
      ) : (
        <video
          autoPlay={boolProp(props.autoplay)}
          className="w-full"
          controls
          loop={boolProp(props.loop)}
          muted={boolProp(props.muted, true)}
          src={videoUrl}
        />
      )}
    </section>
  );
}

export function SpacerBlock({ component }: BuilderBlockProps) {
  const height = textProp(component.props.height) ?? "md";
  const size =
    height === "xl" ? 96 : height === "lg" ? 64 : height === "sm" ? 24 : 40;
  return <div aria-hidden="true" style={{ height: size }} />;
}

export function DividerBlock({ component }: BuilderBlockProps) {
  const text = textProp(component.props.text);
  return (
    <div className="flex items-center gap-4 py-4">
      <hr className="min-w-0 flex-1 border-line" />
      {text ? (
        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
          {text}
        </span>
      ) : null}
      <hr className="min-w-0 flex-1 border-line" />
    </div>
  );
}

export function ScrollZoomBlock({ component }: BuilderBlockProps) {
  const props = component.props;
  const imageUrl = textProp(props.imageUrl);
  return (
    <section className="bg-app">
      <div className="public-storefront-shell grid gap-10 px-4 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-6 md:py-20">
        {imageUrl ? (
          <div className="overflow-hidden rounded-[2rem] border border-line bg-panel shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <img
              alt=""
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.025]"
              src={imageUrl}
            />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">
            DESTAQUE ESPECIAL
          </p>
          <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
            {textProp(props.title) ?? "Destaque"}
          </h2>
          <p className="mt-6 whitespace-pre-wrap text-base font-medium leading-relaxed text-muted">
            {textProp(props.subtitle) ?? textProp(props.text) ?? ""}
          </p>
        </div>
      </div>
    </section>
  );
}
