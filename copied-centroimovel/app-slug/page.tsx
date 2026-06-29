import {
  BreadcrumbListSchema,
  ItemListSchema,
  RealEstateAgentSchema,
} from "@/components/StructuredData";
import { mapTemplateProperty } from "@/lib/seo-utils";
import { EngagementTracker } from "@/modules/storefront/components/EngagementTracker";
import { StorefrontTracker } from "@/modules/storefront/components/StorefrontTracker";
import { getStorefrontProperties } from "@/modules/storefront/lib/storefront-properties";
import { AuroraTemplateSkeleton } from "@/modules/storefront/templates/aurora/AuroraTemplateSkeleton";
import { QuadraTemplateSkeleton } from "@/modules/storefront/templates/quadra/QuadraTemplateSkeleton";
import { getTemplateDefinition } from "@/modules/storefront/templates/registry";
import { db, eq, workspaces } from "@centroimovel/db";
import {
  StoreConfigSchema,
  toPropertySlug,
  type StoreConfig,
} from "@centroimovel/types";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function StorefrontContent({
  slug,
  config,
  effectiveTemplateId,
  userId,
}: {
  slug: string;
  config: StoreConfig;
  effectiveTemplateId: string;
  userId?: string | null;
}) {
  const primaryDomain =
    process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || "centroimovel.com.br";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  const [templateModule, workspace] = await Promise.all([
    getTemplateDefinition(effectiveTemplateId).component(),
    db.query.workspaces.findFirst({
      where: eq(workspaces.slug, slug),
      with: {
        storefront: true,
      },
    }),
  ]);

  if (!workspace || !workspace.storefront) {
    notFound();
  }

  const hasCustomDomain = !!(
    workspace.customDomain && workspace.domainStatus === "ACTIVE"
  );
  const baseUrl = hasCustomDomain
    ? `${protocol}://${workspace.customDomain}`
    : `${protocol}://${slug}.${primaryDomain}`;

  const storefrontProperties = await getStorefrontProperties(workspace.id, {
    limit: 20,
  });

  const TemplateComponent = templateModule.default;
  const mappedProperties = storefrontProperties.map(mapTemplateProperty);

  // Build schema data
  const itemListItems = storefrontProperties.slice(0, 10).map((p, index) => ({
    name: p.title,
    url: `${baseUrl}/imovel/${toPropertySlug({ id: p.id, title: p.title, neighborhood: p.neighborhood, city: p.city })}`,
    image: p.photos[0]?.url,
    price: Number(p.price),
    position: index + 1,
  }));

  return (
    <>
      <StorefrontTracker
        workspaceId={workspace.id}
        action="page_view"
        metadata={{ sourceType: "tenant_lp_home" }}
        userId={userId}
      />
      <EngagementTracker
        workspaceId={workspace.id}
        resourceType="storefront_homepage"
      />
      {/* Real Estate Agent Schema */}
      <RealEstateAgentSchema
        name={config.corretorName ?? workspace.name}
        description={
          config.seo.metaDescription ??
          config.heroSubtitle ??
          `Imobiliária especializada em imóveis - ${config.corretorName ?? workspace.name}`
        }
        url={baseUrl}
        telephone={config.contact?.phone ?? undefined}
        email={config.contact?.email ?? undefined}
        image={config.seo.ogImageUrl ?? undefined}
        address={
          config.contact?.address
            ? {
                streetAddress: config.contact.address,
                addressCountry: "BR",
              }
            : undefined
        }
        openingHours="Mo-Fr 09:00-18:00"
        priceRange="$$"
      />

      {/* Breadcrumb Schema */}
      <BreadcrumbListSchema
        items={[{ name: config.corretorName ?? workspace.name, url: baseUrl }]}
      />

      {/* Item List Schema for Properties */}
      {itemListItems.length > 0 && (
        <ItemListSchema
          name={`Imóveis disponíveis - ${config.corretorName ?? workspace.name}`}
          description={`Lista de imóveis disponíveis em ${config.corretorName ?? workspace.name}`}
          items={itemListItems}
        />
      )}

      {/* Template Component */}
      <TemplateComponent
        config={config}
        properties={mappedProperties}
        slug={slug}
      />
    </>
  );
}

export default async function StorefrontPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, resolvedSearchParams, { userId }] = await Promise.all([
    params,
    searchParams,
    auth(),
  ]);
  const editorTemplate =
    resolvedSearchParams.editor === "1" &&
    typeof resolvedSearchParams.template === "string"
      ? resolvedSearchParams.template
      : null;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
    with: {
      storefront: { columns: { config: true } },
      settings: true,
    },
  });

  if (!workspace || !workspace.storefront) {
    notFound();
  }

  const rawConfig = workspace.storefront.config as Record<string, unknown>;
  const config = StoreConfigSchema.parse(rawConfig);
  const resolvedWhatsapp =
    workspace.settings?.whatsappNumber ?? config.socialLinks?.whatsapp ?? null;
  if (resolvedWhatsapp) config.socialLinks.whatsapp = resolvedWhatsapp;
  const effectiveTemplateId = editorTemplate ?? config.templateId;
  const SkeletonComponent =
    effectiveTemplateId === "quadra"
      ? QuadraTemplateSkeleton
      : AuroraTemplateSkeleton;

  return (
    <Suspense fallback={<SkeletonComponent />}>
      <StorefrontContent
        slug={slug}
        config={config}
        effectiveTemplateId={effectiveTemplateId}
        userId={userId}
      />
    </Suspense>
  );
}
