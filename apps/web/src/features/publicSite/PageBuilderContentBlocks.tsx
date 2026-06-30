import { ArrowRight, Play, Sparkles } from "lucide-react";
import { cx } from "../../components/ui/featureShared";
import { pageBuilderDefaultMedia } from "./pageBuilderDefaultMedia";
import { PageBuilderPreviewEmptyState } from "./PageBuilderEmptyState";
export { ImageBlock } from "./PageBuilderImageBlock";
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
  const firstListing =
    context.vehicles && context.vehicles.length > 0
      ? context.vehicles[0]
      : null;
  const fallbackHeroImage = firstListing?.thumbnailUrl ?? "";
  const imageUrl =
    textProp(props.imageUrl) ??
    fallbackHeroImage ??
    context.config.heroImageUrl ??
    pageBuilderDefaultMedia.audiFront;
  const ctaUrl = textProp(props.ctaUrl) ?? "#estoque";
  return (
    <section className="bg-panel" id="home">
      <div className="public-storefront-shell grid gap-10 px-4 py-16 md:px-6 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="inline-flex w-fit items-center gap-2 rounded bg-accent-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-accent">
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
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              className="group inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded px-8 text-sm font-bold text-inverse shadow-[0_4px_12px_color-mix(in_oklab,var(--color-accent)_15%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_color-mix(in_oklab,var(--color-accent)_25%,transparent)] active:translate-y-0 active:scale-95 cursor-pointer"
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
            <span className="text-xs font-black uppercase tracking-[0.22em] text-muted">
              Estoque revisado
            </span>
          </div>
        </div>
        {imageUrl ? (
          <div className="group relative overflow-hidden rounded-xl border border-line bg-app shadow-md">
            <img
              alt={textProp(props.imageAlt) ?? ""}
              className="aspect-[16/11] w-full object-cover transition-transform duration-700 hover:scale-[1.025]"
              src={imageUrl}
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-lg border border-white/20 bg-app-text/82 p-3 text-white shadow-lg backdrop-blur-sm">
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-white/70">
                  Destaque
                </span>
                <span className="block text-sm font-black leading-tight">
                  Publicacao pronta para conversao
                </span>
              </span>
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: context.accent }}
              >
                <ArrowRight aria-hidden="true" className="size-4" />
              </span>
            </div>
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
    <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-md">
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
  const buttonStyle = textProp(props.buttonStyle) ?? "primary";
  const isPrimary = buttonStyle === "primary";
  return (
    <section className="bg-panel">
      <div className="public-storefront-shell px-4 py-16 text-center md:px-6 md:py-20">
        <div className="rounded-xl border border-line bg-app p-8 shadow-sm md:p-14">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
            {textProp(props.title) ?? "Quer ajuda para escolher?"}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-relaxed text-muted">
            {textProp(props.subtitle) ??
              textProp(props.text) ??
              "Converse com a equipe comercial da loja."}
          </p>
          <a
            className={cx(
              "mt-8 inline-flex min-h-12 items-center justify-center rounded border px-8 text-sm font-bold shadow-[0_4px_12px_color-mix(in_oklab,var(--color-accent)_15%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_color-mix(in_oklab,var(--color-accent)_25%,transparent)] active:translate-y-0 active:scale-95 cursor-pointer",
              isPrimary
                ? "border-transparent text-inverse"
                : buttonStyle === "outline"
                  ? "border-accent bg-transparent text-accent"
                  : "border-transparent bg-accent-soft text-accent",
            )}
            href={href}
            style={isPrimary ? { background: context.accent } : undefined}
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

export function VideoBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const videoUrl = textProp(props.videoUrl) ?? textProp(props.url);
  if (!videoUrl) {
    return context.preview ? (
      <PageBuilderPreviewEmptyState
        icon={Play}
        title="Video sem link"
        text="Cole um YouTube ou arquivo de video para ativar o bloco."
      />
    ) : null;
  }
  const embedUrl = youtubeEmbedUrl(videoUrl, {
    autoplay: boolProp(props.autoplay),
    loop: boolProp(props.loop),
    muted: boolProp(props.muted, true),
  });
  return (
    <section className="public-storefront-shell overflow-hidden rounded-xl border border-line bg-panel shadow-md">
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
  const variant = textProp(component.props.lineVariant) ?? "solid";
  const lineClass =
    variant === "dashed"
      ? "border-dashed"
      : variant === "dotted"
        ? "border-dotted"
        : "border-solid";
  const lineStyle =
    variant === "accent" ? { borderColor: "var(--color-accent)" } : undefined;
  return (
    <div className="flex items-center gap-4 py-4">
      <hr
        className={cx("min-w-0 flex-1 border-line", lineClass)}
        style={lineStyle}
      />
      {text ? (
        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
          {text}
        </span>
      ) : null}
      <hr
        className={cx("min-w-0 flex-1 border-line", lineClass)}
        style={lineStyle}
      />
    </div>
  );
}

export function ScrollZoomBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const imageUrl =
    textProp(props.imageUrl) ??
    (context.preview ? pageBuilderDefaultMedia.audiRear : null);
  return (
    <section className="bg-app">
      <div className="public-storefront-shell grid gap-10 px-4 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-6 md:py-20">
        {imageUrl ? (
          <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-md">
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
