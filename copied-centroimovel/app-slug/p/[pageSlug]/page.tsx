// Dynamic: Tenant-specific custom page data must be fresh per request
export const dynamic = "force-dynamic";

import { BuilderComponentRenderer } from "@/modules/storefront/components/builder";
import { collectFontFamiliesFromPageComponents } from "@/modules/storefront/components/builder/collect-component-fonts";
import { CustomPageChrome } from "@/modules/storefront/components/custom-page/CustomPageChrome";
import { migrateModularCustomRoute } from "@/modules/storefront/lib/migrate-custom-page-route";
import { db, eq, workspaces } from "@centroimovel/db";
import {
  StoreConfigSchema,
  type BackgroundConfig,
  type PageChrome,
  type StoreConfig,
} from "@centroimovel/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string; pageSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}): Promise<Metadata> {
  const { slug, pageSlug } = await params;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
    with: {
      storefront: true,
    },
  });

  const customRoutes =
    (workspace?.storefront?.customRoutes as Array<{
      slug: string;
      label: string;
      seo?: {
        metaTitle?: string;
        metaDescription?: string;
        ogImageUrl?: string;
      };
    }>) || [];
  const customPage = customRoutes.find((route) => route.slug === pageSlug);

  if (!customPage) {
    return {};
  }

  return {
    title: customPage.seo?.metaTitle || customPage.label,
    description: customPage.seo?.metaDescription,
    openGraph: customPage.seo?.ogImageUrl
      ? {
          images: [{ url: customPage.seo.ogImageUrl }],
        }
      : undefined,
  };
}

function buildGoogleFontsHref(fonts: string[]): string | null {
  const families = fonts
    .map((font) => font?.trim())
    .filter(
      (font): font is string =>
        Boolean(font) &&
        font !== "system-ui" &&
        font !== "serif" &&
        font !== "sans-serif",
    )
    .map((font) => `family=${font.replace(/\s+/g, "+")}:wght@400;500;600;700`);

  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

function buildBackgroundGradient(
  background?: BackgroundConfig,
): string | undefined {
  if (background?.type !== "gradient" || !background.gradient) {
    return undefined;
  }

  const stops = background.gradient.stops
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(", ");

  return background.gradient.type === "radial"
    ? `radial-gradient(${stops})`
    : `linear-gradient(${background.gradient.angle}deg, ${stops})`;
}

function mapProperty(property: {
  id: string;
  title: string;
  type: string;
  purpose: string;
  price: unknown;
  rentPrice: unknown;
  areaM2: unknown;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  amenities: unknown;
  featured: boolean;
  hidePrice: boolean;
  photos: Array<{ url: string }>;
}) {
  return {
    id: property.id,
    title: property.title,
    type: property.type,
    purpose: property.purpose,
    price: Number(property.price),
    rentPrice: property.rentPrice ? Number(property.rentPrice) : null,
    areaM2: property.areaM2 ? Number(property.areaM2) : null,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parkingSpots: property.parkingSpots,
    neighborhood: property.neighborhood,
    city: property.city,
    state: property.state,
    coverPhotoUrl: property.photos[0]?.url ?? null,
    amenities: (property.amenities as string[]) ?? [],
    featured: property.featured,
    hidePrice: property.hidePrice,
  };
}

export default async function CustomPageRoute({
  params,
  searchParams,
}: PageProps) {
  const { slug, pageSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const token =
    typeof resolvedSearchParams.token === "string"
      ? resolvedSearchParams.token
      : null;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
    with: {
      storefront: true,
      properties: {
        where: (props, { eq: eqOp }) => eqOp(props.status, "DISPONIVEL"),
        with: {
          photos: true,
        },
        orderBy: (props, { desc: descOp }) => [
          descOp(props.featured),
          descOp(props.createdAt),
        ],
      },
    },
  });

  if (!workspace || !workspace.storefront) {
    notFound();
  }

  // Filter to only cover photos (Drizzle relational queries don't support nested where on `with`)
  workspace.properties = workspace.properties.map((p) => ({
    ...p,
    photos: p.photos.filter((ph) => ph.isCover).slice(0, 1),
  }));

  // Find the custom page
  const customRoutes = workspace.storefront.customRoutes as Array<{
    id: string;
    slug: string;
    label: string;
    visible: boolean;
    secretToken?: string;
    backgroundColor?: string;
    accentColor?: string;
    fontFamily?: string;
    pageBackground?: import("@centroimovel/types").BackgroundConfig;
    pageChrome?: PageChrome;
    components: Array<{
      id: string;
      type: string;
      props: Record<string, unknown>;
      visible: boolean;
      order: number;
    }>;
  }>;

  const customPage = customRoutes?.find((r) => r.slug === pageSlug);

  if (!customPage) {
    notFound();
  }

  // Check visibility - require token for unpublished pages
  if (!customPage.visible) {
    if (!token || token !== customPage.secretToken) {
      notFound();
    }
  }

  const pageNormalized = migrateModularCustomRoute({
    ...customPage,
    components: customPage.components ?? [],
  } as Record<string, unknown>) as typeof customPage;

  // Get store config
  const rawConfig = workspace.storefront.config as Record<string, unknown>;
  const config = StoreConfigSchema.parse(rawConfig);
  const pageConfig: StoreConfig = {
    ...config,
    ...(customPage.accentColor ? { accentColor: customPage.accentColor } : {}),
    ...(customPage.fontFamily
      ? {
          fonts: {
            ...config.fonts,
            heading: customPage.fontFamily,
            body: customPage.fontFamily,
          },
        }
      : {}),
  };

  // Get properties for the property grid components
  const properties = workspace.properties.map(mapProperty);

  // Sort components by order
  const sortedComponents = (pageNormalized.components || [])
    .filter((c) => c.visible)
    .sort((a, b) => a.order - b.order)
    .map((c) =>
      c.type === "contact_form" ? { ...c, type: "contact_section" } : c,
    );

  const fontFamiliesFromComponents = collectFontFamiliesFromPageComponents(
    (pageNormalized.components || []) as Array<{
      type: string;
      props: Record<string, unknown>;
    }>,
  );

  // Page-level background (new unified system with legacy fallback)
  const pageBackground: BackgroundConfig | undefined =
    customPage.pageBackground || {
      type: "solid",
      solidColor:
        customPage.backgroundColor || config.backgroundColor || "#F8F5F0",
    };
  const fontsHref = buildGoogleFontsHref([
    config.fonts?.heading || "",
    config.fonts?.body || "",
    customPage.fontFamily || "",
    ...fontFamiliesFromComponents,
  ]);

  return (
    <div
      className="relative min-h-screen"
      style={{
        backgroundColor:
          pageBackground.type === "solid"
            ? pageBackground.solidColor
            : undefined,
        minHeight: "100vh",
      }}
    >
      {fontsHref && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link rel="stylesheet" href={fontsHref} />
        </>
      )}
      {/* Page-level backgrounds: non-negative z-index so they paint above the canvas/body */}
      {pageBackground.type === "gradient" && (
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background: pageBackground.gradient
              ? buildBackgroundGradient(pageBackground)
              : undefined,
          }}
        />
      )}
      {pageBackground.type === "image" && pageBackground.imageUrl && (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${pageBackground.imageUrl})` }}
        >
          {pageBackground.overlay?.enabled && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: pageBackground.overlay.color,
                opacity: (pageBackground.overlay.opacity ?? 50) / 100,
              }}
            />
          )}
        </div>
      )}
      {pageBackground.type === "video" && pageBackground.videoUrl && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover"
        >
          <source src={pageBackground.videoUrl} />
        </video>
      )}
      <div className="relative z-10">
        <CustomPageChrome
          slug={slug}
          corretorName={config.corretorName || workspace.name}
          logoUrl={config.logoUrl}
          pageChrome={customPage.pageChrome}
        >
          {sortedComponents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h1 className="text-2xl font-bold mb-2">{customPage.label}</h1>
              <p className="text-muted-foreground">Esta página está vazia.</p>
              <a
                href={`/${slug}/admin/website/pages/${customPage.id}`}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Adicionar componentes
              </a>
            </div>
          ) : (
            sortedComponents.map((component) => (
              <BuilderComponentRenderer
                key={component.id}
                type={component.type}
                props={component.props}
                config={pageConfig}
                slug={slug}
                properties={properties}
                pageBackground={pageBackground}
                workspaceDisplayName={workspace.name}
              />
            ))
          )}
        </CustomPageChrome>
      </div>
    </div>
  );
}
