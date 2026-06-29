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
      <div className="public-storefront-shell grid gap-10 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-strong">
            <Sparkles aria-hidden="true" className="size-4" />
            {textProp(props.badge) ?? textProp(props.eyebrow) ?? "Site publico"}
          </p>
          <h1 className="mt-5 max-w-3xl break-words text-4xl font-semibold leading-[0.98] tracking-tight md:text-6xl">
            {textProp(props.title) ?? context.config.storeName}
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-muted md:text-xl">
            {textProp(props.subtitle) ??
              "Atendimento direto e estoque publicado pela loja."}
          </p>
          <a
            className="group mt-8 inline-flex min-h-12 w-fit items-center gap-2 rounded-full px-6 text-sm font-semibold text-inverse shadow-[0_18px_44px_color-mix(in_oklab,var(--color-accent)_22%,transparent)] transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]"
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
          <img
            alt={textProp(props.imageAlt) ?? ""}
            className="aspect-[16/11] w-full rounded-[2rem] object-cover shadow-[0_30px_90px_rgb(15_23_42_/_0.16)]"
            src={imageUrl}
          />
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
      <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
        {textProp(props.title) ?? "Sobre a loja"}
      </h2>
      <p className="mt-5 whitespace-pre-wrap text-base font-medium leading-8 text-muted">
        {textProp(props.text) ?? ""}
      </p>
    </div>
  );
  const imageContent = imageUrl ? (
    <img
      alt=""
      className="aspect-[4/3] w-full rounded-[1.5rem] object-cover shadow-[0_24px_70px_rgb(15_23_42_/_0.12)]"
      src={imageUrl}
    />
  ) : null;
  return (
    <section className="bg-app">
      <div className="public-storefront-shell grid gap-10 px-4 py-14 md:grid-cols-2 md:px-6 md:py-20">
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
      <p className="mx-auto max-w-3xl whitespace-pre-wrap text-lg font-medium leading-8 text-muted">
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
      <div className="public-storefront-shell px-4 py-14 text-center md:px-6 md:py-20">
        <div className="rounded-[2rem] bg-app p-8 shadow-[0_24px_70px_rgb(15_23_42_/_0.08)] md:p-12">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {textProp(props.title) ?? "Quer ajuda para escolher?"}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-8 text-muted">
            {textProp(props.subtitle) ??
              textProp(props.text) ??
              "Converse com a equipe comercial da loja."}
          </p>
          <a
            className="mt-7 inline-flex min-h-12 items-center rounded-full px-6 text-sm font-semibold text-inverse shadow-[0_18px_44px_color-mix(in_oklab,var(--color-accent)_22%,transparent)] transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]"
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
    <figure className="group public-storefront-shell overflow-hidden rounded-[1.5rem] bg-panel shadow-[0_24px_70px_rgb(15_23_42_/_0.1)]">
      <img
        alt={textProp(props.alt) ?? textProp(props.caption) ?? ""}
        className="max-h-[36rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
        src={imageUrl}
      />
      {textProp(props.caption) ? (
        <figcaption className="border-t border-line p-4 text-sm font-medium text-muted">
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
    <section className="public-storefront-shell overflow-hidden rounded-[1.5rem] bg-panel shadow-[0_24px_70px_rgb(15_23_42_/_0.1)]">
      {embedUrl ? (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
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
    <div className="flex items-center gap-3">
      <hr className="min-w-0 flex-1 border-line" />
      {text ? (
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
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
      <div className="public-storefront-shell grid gap-10 px-4 py-14 md:grid-cols-[0.9fr_1.1fr] md:px-6 md:py-20">
        {imageUrl ? (
          <img
            alt=""
            className="aspect-[4/3] w-full rounded-[1.5rem] object-cover shadow-[0_24px_70px_rgb(15_23_42_/_0.12)]"
            src={imageUrl}
          />
        ) : null}
        <div className="flex min-w-0 flex-col justify-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {textProp(props.title) ?? "Destaque"}
          </h2>
          <p className="mt-5 whitespace-pre-wrap text-base font-medium leading-8 text-muted">
            {textProp(props.subtitle) ?? textProp(props.text) ?? ""}
          </p>
        </div>
      </div>
    </section>
  );
}
