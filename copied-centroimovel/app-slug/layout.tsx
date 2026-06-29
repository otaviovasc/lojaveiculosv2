import { MetaPixel } from "@/components/meta-pixel";
import { and, db, eq, integrations, workspaces } from "@centroimovel/db";
import { StoreConfigSchema } from "@centroimovel/types";
import type { Metadata } from "next";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Generate metadata for tenant storefronts
 * Includes:
 * - Dynamic title/description from store config
 * - Canonical URLs
 * - OpenGraph/Twitter cards
 * - Robots directives
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  let workspace;
  try {
    workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.slug, slug),
      with: { storefront: true },
    });
  } catch (error) {
    console.error(`Failed to fetch workspace for slug "${slug}":`, error);
    return {
      title: "Erro",
      robots: { index: false, follow: false },
    };
  }

  if (!workspace?.storefront) {
    return {
      title: "Não encontrado",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const parseResult = StoreConfigSchema.safeParse(
    workspace.storefront.config as Record<string, unknown>,
  );
  if (!parseResult.success) {
    console.error(
      `Invalid storefront config for workspace "${slug}":`,
      parseResult.error,
    );
    return {
      title: workspace.name,
      robots: { index: true, follow: true },
    };
  }
  const config = parseResult.data;

  const primaryDomain =
    process.env.NEXT_PUBLIC_PRIMARY_DOMAIN?.trim() || "centroimovel.com.br";
  const protocol = primaryDomain === "localhost" ? "http" : "https";
  const baseUrl = `${protocol}://${slug}.${primaryDomain}`;
  const canonicalUrl = `${baseUrl}/`;

  const title =
    config.seo.metaTitle ??
    `${config.corretorName ?? workspace.name} — Imóveis`;
  const description =
    config.seo.metaDescription ??
    config.heroSubtitle ??
    `Encontre imóveis com ${config.corretorName ?? workspace.name}. Apartamentos, casas e muito mais.`;

  return {
    title,
    description,

    // Canonical URL - prevents duplicate content issues
    alternates: {
      canonical: canonicalUrl,
    },

    // Open Graph for social sharing
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      locale: "pt_BR",
      type: "website",
      siteName: config.corretorName ?? workspace.name,
      images: config.seo.ogImageUrl
        ? [
            {
              url: config.seo.ogImageUrl,
              width: 1200,
              height: 630,
              alt: `${config.corretorName ?? workspace.name} - Imóveis`,
            },
          ]
        : [
            {
              url: `https://${primaryDomain}/images/og/centroimovel-og.png`,
              width: 1200,
              height: 630,
              alt: `${config.corretorName ?? workspace.name} - Imóveis`,
            },
          ],
    },

    // Twitter Cards
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: config.seo.ogImageUrl
        ? [config.seo.ogImageUrl]
        : [`https://${primaryDomain}/images/og/centroimovel-og.png`],
    },

    // Robots directives
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    // Additional metadata
    authors: config.corretorName ? [{ name: config.corretorName }] : undefined,
    creator: config.corretorName ?? workspace.name,
    publisher: config.corretorName ?? workspace.name,

    // Category
    category: "real estate",
  };
}

export default async function StorefrontLayout({
  children,
  params,
}: LayoutProps) {
  const { slug } = await params;

  // ── Fetch Meta Pixel integration ──────────────────────────────────────
  let pixelId: string | null = null;
  try {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.slug, slug),
    });

    if (workspace) {
      const metaIntegration = await db.query.integrations.findFirst({
        where: and(
          eq(integrations.workspaceId, workspace.id),
          eq(integrations.provider, "META_ADS"),
          eq(integrations.status, "CONNECTED"),
        ),
      });

      const config = metaIntegration?.config as
        { pixelId?: string } | null | undefined;
      if (config?.pixelId) {
        pixelId = config.pixelId;
      }
    }
  } catch (error) {
    console.error("Failed to fetch Meta Pixel integration:", error);
  }

  return (
    <>
      {pixelId && <MetaPixel pixelId={pixelId} />}
      {children}
    </>
  );
}
