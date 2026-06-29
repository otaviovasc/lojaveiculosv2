import type {
  StorefrontBuilderComponent,
  StorefrontBuilderConfig,
  StorefrontBuilderVehicle,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";
import type { CSSProperties, ReactNode } from "react";
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
import {
  collectPageBuilderFonts,
  createPageBuilderBlockStyle,
} from "./pageBuilderBlockStyle";
import {
  createPageBackgroundStyle,
  PageBackgroundLayer,
  PageChromeFooter,
  PageChromeHeader,
} from "./PageBuilderChrome";
import type { BuilderRenderContext } from "./pageBuilderRenderTypes";
import { componentArrayProp } from "./pageBuilderRenderUtils";
import { fontStack, StorefrontFontLinks } from "./storefrontFonts";

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
  const pageBackground = page.pageBackground ?? {
    solidColor: background,
    type: "solid",
  };
  const pageFont = page.fontFamily ?? config.fonts.body;
  const headingFont = config.fonts.heading;
  const blockFonts = collectPageBuilderFonts(page.components);
  const pageStyle: CSSProperties & Record<`--${string}`, string> = {
    ...createPageBackgroundStyle(pageBackground, background),
    "--page-builder-heading-font": fontStack(headingFont),
    fontFamily: fontStack(pageFont),
  };

  const renderBlocks = (
    components: readonly StorefrontBuilderComponent[] | unknown,
    className = "grid gap-5",
  ) => (
    <div className={className}>
      {componentArrayProp(components)
        .filter((component) => component.visible)
        .sort((a, b) => a.order - b.order)
        .map((component) => (
          <BuilderBlockFrame component={component} key={component.id}>
            <BuilderBlock component={component} context={context} />
          </BuilderBlockFrame>
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
    <>
      <StorefrontFontLinks fonts={[pageFont, headingFont, ...blockFonts]} />
      <main
        className="page-builder-renderer min-h-screen text-app-text"
        style={pageStyle}
      >
        <PageBackgroundLayer background={pageBackground} />
        {page.pageChrome?.showHeader !== false ? (
          <PageChromeHeader
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
        {page.pageChrome?.showFooter !== false ? (
          <PageChromeFooter
            config={config}
            page={page}
            {...(storeSlug ? { storeSlug } : {})}
          />
        ) : null}
      </main>
    </>
  );
}

function BuilderBlockFrame({
  children,
  component,
}: {
  children: ReactNode;
  component: StorefrontBuilderComponent;
}) {
  const style = createPageBuilderBlockStyle(component);
  if (!style) return children;
  return <div style={style}>{children}</div>;
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
