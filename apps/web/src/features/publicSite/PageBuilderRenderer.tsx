import type {
  StorefrontBuilderComponent,
  StorefrontBuilderConfig,
  StorefrontBuilderVehicle,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";
import {
  AboutBlock,
  CtaBlock,
  DividerBlock,
  HeroBlock,
  ImageBlock,
  ScrollZoomBlock,
  SpacerBlock,
  TextBlock,
  VideoBlock,
} from "./PageBuilderContentBlocks";
import {
  ContactSectionBlock,
  FooterBlock,
  GalleryBlock,
  HeaderBlock,
  MapBlock,
  MarqueeBlock,
  TestimonialsBlock,
  TypewriterBlock,
  VehicleGridBlock,
} from "./PageBuilderCollectionBlocks";
import {
  ContainerBlock,
  SectionWrapperBlock,
  TwoColumnBlock,
} from "./PageBuilderLayoutBlocks";
import type { BuilderRenderContext } from "./pageBuilderRenderTypes";
import { componentArrayProp } from "./pageBuilderRenderUtils";

type PageBuilderRendererProps = {
  config: StorefrontBuilderConfig;
  page: StorefrontCustomPage;
  preview?: boolean;
  storeSlug?: string;
  vehicles?: readonly StorefrontBuilderVehicle[];
};

export function PageBuilderRenderer({
  config,
  page,
  preview = false,
  storeSlug,
  vehicles = [],
}: PageBuilderRendererProps) {
  const accent = page.accentColor ?? config.accentColor;
  const background = page.backgroundColor ?? config.backgroundColor;

  const renderBlocks = (
    components: readonly StorefrontBuilderComponent[] | unknown,
    className = "grid gap-5",
  ) => (
    <div className={className}>
      {componentArrayProp(components)
        .filter((component) => component.visible)
        .sort((a, b) => a.order - b.order)
        .map((component) => (
          <BuilderBlock
            component={component}
            context={context}
            key={component.id}
          />
        ))}
    </div>
  );

  const context: BuilderRenderContext = {
    accent,
    config,
    pageSlug: page.slug,
    preview,
    renderBlocks,
    ...(storeSlug ? { storeSlug } : {}),
    vehicles,
  };

  return (
    <main
      className="min-h-screen text-app-text"
      style={{
        background,
        fontFamily: page.fontFamily ?? config.fonts.body,
      }}
    >
      {page.pageChrome?.showHeader !== false ? (
        <PageChromeHeader
          accent={accent}
          config={config}
          page={page}
          preview={preview}
          {...(storeSlug ? { storeSlug } : {})}
        />
      ) : null}
      <div
        className={
          page.pageChrome?.showHeader !== false && !preview
            ? "relative z-10 grid w-full gap-5 pt-16"
            : "relative z-10 grid w-full gap-5"
        }
      >
        {renderBlocks(page.components, "contents")}
      </div>
      <PageChromeFooter
        config={config}
        page={page}
        {...(storeSlug ? { storeSlug } : {})}
      />
    </main>
  );
}

function BuilderBlock({
  component,
  context,
}: {
  component: StorefrontBuilderComponent;
  context: BuilderRenderContext;
}) {
  if (component.type === "header") {
    return <HeaderBlock component={component} context={context} />;
  }
  if (component.type === "hero") {
    return <HeroBlock component={component} context={context} />;
  }
  if (component.type === "about") {
    return <AboutBlock component={component} context={context} />;
  }
  if (component.type === "text_block") {
    return <TextBlock component={component} context={context} />;
  }
  if (component.type === "cta") {
    return <CtaBlock component={component} context={context} />;
  }
  if (component.type === "image") {
    return <ImageBlock component={component} context={context} />;
  }
  if (component.type === "gallery") {
    return <GalleryBlock component={component} context={context} />;
  }
  if (component.type === "video") {
    return <VideoBlock component={component} context={context} />;
  }
  if (component.type === "testimonials") {
    return <TestimonialsBlock component={component} context={context} />;
  }
  if (component.type === "featured" || component.type === "properties_grid") {
    return <VehicleGridBlock component={component} context={context} />;
  }
  if (component.type === "contact_section") {
    return <ContactSectionBlock component={component} context={context} />;
  }
  if (component.type === "map") {
    return <MapBlock component={component} context={context} />;
  }
  if (component.type === "marquee") {
    return <MarqueeBlock component={component} context={context} />;
  }
  if (component.type === "typewriter") {
    return <TypewriterBlock component={component} context={context} />;
  }
  if (component.type === "container") {
    return <ContainerBlock component={component} context={context} />;
  }
  if (component.type === "two_column") {
    return <TwoColumnBlock component={component} context={context} />;
  }
  if (component.type === "section_wrapper") {
    return <SectionWrapperBlock component={component} context={context} />;
  }
  if (component.type === "scroll_zoom") {
    return <ScrollZoomBlock component={component} context={context} />;
  }
  if (component.type === "spacer") {
    return <SpacerBlock component={component} context={context} />;
  }
  if (component.type === "divider") {
    return <DividerBlock component={component} context={context} />;
  }
  if (component.type === "footer") {
    return <FooterBlock component={component} context={context} />;
  }
  return <TextBlock component={component} context={context} />;
}

function PageChromeHeader({
  accent,
  config,
  page,
  preview,
  storeSlug,
}: {
  accent: string;
  config: StorefrontBuilderConfig;
  page: StorefrontCustomPage;
  preview: boolean;
  storeSlug?: string;
}) {
  const href = storeSlug ? `/${storeSlug}` : "/";
  return (
    <header
      className={
        preview
          ? "sticky top-0 z-40 flex w-full items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md"
          : "fixed left-0 right-0 top-0 z-40 flex w-full items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md"
      }
    >
      <a
        className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-70"
        href={href}
      >
        {config.logoUrl ? (
          <img
            alt={config.storeName}
            className="h-7 w-auto object-contain"
            src={config.logoUrl}
          />
        ) : (
          <strong className="truncate text-sm font-black">
            {config.storeName}
          </strong>
        )}
      </a>
      {page.pageChrome?.showSiteLink !== false ? (
        <a
          className="text-xs font-bold text-muted transition-opacity hover:opacity-75"
          href={href}
          style={
            page.pageChrome?.headerLinkColor
              ? { color: page.pageChrome.headerLinkColor }
              : { color: accent }
          }
        >
          Voltar ao site
        </a>
      ) : null}
    </header>
  );
}

function PageChromeFooter({
  config,
  page,
  storeSlug,
}: {
  config: StorefrontBuilderConfig;
  page: StorefrontCustomPage;
  storeSlug?: string;
}) {
  const href = storeSlug ? `/${storeSlug}` : "/";
  return (
    <footer className="relative z-10 border-t border-border/40 py-8 text-center text-sm text-muted">
      <a className="transition-opacity hover:opacity-80" href={href}>
        {new Date().getFullYear()} {config.storeName || page.slug}
      </a>
    </footer>
  );
}
