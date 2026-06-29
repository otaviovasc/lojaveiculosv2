import type {
  StorefrontBuilderComponent,
  StorefrontBuilderConfig,
  StorefrontBuilderVehicle,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
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
import { blockLabel } from "./builderBlockCatalog";

type PageBuilderRendererProps = {
  config: StorefrontBuilderConfig;
  onSelectComponent?: (componentId: string) => void;
  page: StorefrontCustomPage;
  preview?: boolean;
  selectedComponentId?: string | null;
  storeSlug?: string;
  vehicles?: readonly StorefrontBuilderVehicle[];
};

export function PageBuilderRenderer({
  config,
  onSelectComponent,
  page,
  preview = false,
  selectedComponentId,
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
        .filter(
          (component) => component.visible || (preview && onSelectComponent),
        )
        .sort((a, b) => a.order - b.order)
        .map((component) => (
          <BuilderBlockFrame
            component={component}
            key={component.id}
            preview={preview}
            selected={selectedComponentId === component.id}
            {...(onSelectComponent ? { onSelect: onSelectComponent } : {})}
          >
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
  onSelect,
  preview,
  selected,
}: {
  children: ReactNode;
  component: StorefrontBuilderComponent;
  onSelect?: (componentId: string) => void;
  preview: boolean;
  selected: boolean;
}) {
  const style = createPageBuilderBlockStyle(component);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!preview || !onSelect) return undefined;

    const node = frameRef.current;
    if (!node) return undefined;

    const selectBlock = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(component.id);
    };

    node.addEventListener("click", selectBlock, { capture: true });
    return () => {
      node.removeEventListener("click", selectBlock, { capture: true });
    };
  }, [component.id, onSelect, preview]);

  if (!preview || !onSelect) {
    if (!style) return children;
    return <div style={style}>{children}</div>;
  }

  return (
    <div
      aria-label={`Editar bloco ${blockLabel(component.type)}`}
      className={cn(
        "group relative cursor-pointer rounded-xl transition-[box-shadow,transform,filter] duration-200 ease-out",
        selected
          ? "z-30 shadow-[0_0_0_2px_var(--color-accent),0_18px_50px_color-mix(in_oklab,var(--color-accent)_24%,transparent)]"
          : "hover:z-20 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_50%,transparent),0_14px_36px_color-mix(in_oklab,var(--color-text)_12%,transparent)] hover:[filter:saturate(1.04)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      data-builder-block-id={component.id}
      data-selected={selected ? "true" : undefined}
      onClickCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect(component.id);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        onSelect(component.id);
      }}
      ref={frameRef}
      role="button"
      style={style ?? undefined}
      tabIndex={0}
    >
      <div
        className={cn(
          "pointer-events-none absolute left-3 top-3 z-50 inline-flex translate-y-1 items-center gap-2 rounded-full border border-line bg-panel/95 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-app-text opacity-0 shadow-lg backdrop-blur transition-all duration-200",
          selected
            ? "translate-y-0 opacity-100"
            : "group-hover:translate-y-0 group-hover:opacity-100",
        )}
      >
        {blockLabel(component.type)}
        {!component.visible ? (
          <span className="rounded-full bg-warning px-2 py-0.5 text-[9px] text-warning-foreground">
            Oculto
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "transition-opacity",
          !component.visible && "opacity-40 grayscale",
        )}
      >
        {children}
      </div>
    </div>
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
