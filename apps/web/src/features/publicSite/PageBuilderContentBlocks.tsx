import { Sparkles } from "lucide-react";
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
    <section
      className="grid gap-5 overflow-hidden rounded-lg border border-line bg-panel p-5 lg:grid-cols-[1.1fr_0.9fr] lg:p-6"
      id="home"
    >
      <div className="flex min-w-0 flex-col justify-center">
        <p className="inline-flex w-fit items-center gap-2 rounded-lg bg-accent-soft px-3 py-1 text-xs font-black uppercase tracking-widest text-accent-strong">
          <Sparkles aria-hidden="true" className="size-4" />
          {textProp(props.badge) ?? textProp(props.eyebrow) ?? "Site publico"}
        </p>
        <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
          {textProp(props.title) ?? context.config.storeName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-bold text-muted md:text-base">
          {textProp(props.subtitle) ??
            "Atendimento direto e estoque publicado pela loja."}
        </p>
        <a
          className="mt-5 inline-flex min-h-11 w-fit items-center rounded-lg px-4 text-sm font-black text-inverse"
          href={ctaUrl}
          style={{ background: context.accent }}
        >
          {textProp(props.ctaLabel) ??
            textProp(props.primaryLabel) ??
            "Ver estoque"}
        </a>
      </div>
      {imageUrl ? (
        <img
          alt={textProp(props.imageAlt) ?? ""}
          className="aspect-[16/10] w-full rounded-lg object-cover"
          src={imageUrl}
        />
      ) : null}
    </section>
  );
}

export function AboutBlock({ component }: BuilderBlockProps) {
  const props = component.props;
  const imageUrl = textProp(props.imageUrl);
  const imageLeft = textProp(props.imagePosition) === "left";
  const textContent = (
    <div className="flex min-w-0 flex-col justify-center">
      <h2 className="text-2xl font-black">
        {textProp(props.title) ?? "Sobre a loja"}
      </h2>
      <p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-6 text-muted">
        {textProp(props.text) ?? ""}
      </p>
    </div>
  );
  const imageContent = imageUrl ? (
    <img
      alt=""
      className="aspect-[4/3] w-full rounded-lg object-cover"
      src={imageUrl}
    />
  ) : null;
  return (
    <section className="grid gap-5 rounded-lg border border-line bg-panel p-5 md:grid-cols-2">
      {imageLeft ? imageContent : textContent}
      {imageLeft ? textContent : imageContent}
    </section>
  );
}

export function TextBlock({ component }: BuilderBlockProps) {
  const props = component.props;
  return (
    <section
      className={cx(
        classForMaxWidth(props.maxWidth),
        "mx-auto w-full rounded-lg border border-line bg-panel p-5",
        classForTextAlign(props.alignment),
      )}
    >
      <p className="whitespace-pre-wrap text-sm font-bold leading-6 text-muted">
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
    <section className="rounded-lg border border-line bg-panel p-5 text-center">
      <h2 className="text-2xl font-black">
        {textProp(props.title) ?? "Quer ajuda para escolher?"}
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm font-bold text-muted">
        {textProp(props.subtitle) ??
          textProp(props.text) ??
          "Converse com a equipe comercial da loja."}
      </p>
      <a
        className="mt-5 inline-flex min-h-11 items-center rounded-lg px-4 font-black text-inverse"
        href={href}
        style={{ background: context.accent }}
      >
        {textProp(props.buttonLabel) ??
          textProp(props.label) ??
          "Chamar no WhatsApp"}
      </a>
    </section>
  );
}

export function ImageBlock({ component }: BuilderBlockProps) {
  const props = component.props;
  const imageUrl = textProp(props.imageUrl) ?? textProp(props.url);
  if (!imageUrl) return null;
  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-panel">
      <img
        alt={textProp(props.alt) ?? textProp(props.caption) ?? ""}
        className="max-h-[32rem] w-full object-cover"
        src={imageUrl}
      />
      {textProp(props.caption) ? (
        <figcaption className="border-t border-line p-3 text-sm font-bold text-muted">
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
    <section className="overflow-hidden rounded-lg border border-line bg-panel">
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
        <span className="text-xs font-black uppercase tracking-widest text-muted">
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
    <section className="grid gap-5 rounded-lg border border-line bg-panel p-5 md:grid-cols-[0.9fr_1.1fr]">
      {imageUrl ? (
        <img
          alt=""
          className="aspect-[4/3] w-full rounded-lg object-cover"
          src={imageUrl}
        />
      ) : null}
      <div className="flex min-w-0 flex-col justify-center">
        <h2 className="text-2xl font-black">
          {textProp(props.title) ?? "Destaque"}
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-6 text-muted">
          {textProp(props.subtitle) ?? textProp(props.text) ?? ""}
        </p>
      </div>
    </section>
  );
}
