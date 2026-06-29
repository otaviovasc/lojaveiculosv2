"use client";

import { GlassFilter } from "@/components/ui/glass-filter";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { TemplateProps } from "../registry";
import { AuroraAbout } from "./AuroraAbout";
import { AuroraContact } from "./AuroraContact";
import { AuroraFeatured } from "./AuroraFeatured";
import { AuroraFooter } from "./AuroraFooter";
import { AuroraHeader } from "./AuroraHeader";
import { AuroraHero } from "./AuroraHero";
import { AuroraTestimonials } from "./AuroraTestimonials";
import { AuroraWhatsAppButton } from "./AuroraWhatsAppButton";

export default function AuroraTemplate({
  config: serverConfig,
  properties,
  slug,
}: TemplateProps) {
  const searchParams = useSearchParams();
  const isEditorMode = searchParams.get("editor") === "1";
  const [editorOverrides, setEditorOverrides] = useState<
    Record<string, unknown>
  >({});

  useEffect(() => {
    if (!isEditorMode) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "editor:update") return;
      const payload = event.data.payload as Record<string, unknown>;
      setEditorOverrides((prev) => ({ ...prev, ...payload }));
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isEditorMode]);

  const config = useMemo(() => {
    if (!isEditorMode || Object.keys(editorOverrides).length === 0)
      return serverConfig;
    return {
      ...serverConfig,
      ...editorOverrides,
      socialLinks: {
        ...serverConfig.socialLinks,
        ...(typeof editorOverrides.socialLinks === "object" &&
        editorOverrides.socialLinks
          ? (editorOverrides.socialLinks as Record<string, unknown>)
          : {}),
      },
      contact: {
        ...serverConfig.contact,
        ...(typeof editorOverrides.contact === "object" &&
        editorOverrides.contact
          ? (editorOverrides.contact as Record<string, unknown>)
          : {}),
      },
      fonts: {
        ...serverConfig.fonts,
        ...(typeof editorOverrides.fonts === "object" && editorOverrides.fonts
          ? (editorOverrides.fonts as Record<string, unknown>)
          : {}),
      },
      sections: Array.isArray(editorOverrides.sections)
        ? (editorOverrides.sections as typeof serverConfig.sections)
        : serverConfig.sections,
      testimonials: Array.isArray(editorOverrides.testimonials)
        ? (editorOverrides.testimonials as typeof serverConfig.testimonials)
        : serverConfig.testimonials,
    } as typeof serverConfig;
  }, [serverConfig, editorOverrides, isEditorMode]);

  const featuredProperties = properties.filter((p) => p.featured);
  const featuredOrAllProperties =
    featuredProperties.length > 0 ? featuredProperties : properties;
  const visibleSections = config.sections
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order);

  const hasHero = visibleSections.some((s) => s.type === "hero");
  const hasPropertySectionVisible = visibleSections.some(
    (s) =>
      s.type === "featured" ||
      s.type === "all_properties" ||
      s.type === "search",
  );

  return (
    <div
      className="min-h-screen selection:bg-brand/20"
      style={
        {
          "--aurora-brand": config.brandColor,
          "--aurora-accent": config.accentColor,
          "--aurora-bg": config.backgroundColor,
          backgroundColor: config.backgroundColor ?? "#F8F5F0",
          fontFamily: `"${config.fonts.body}", sans-serif`,
        } as React.CSSProperties
      }
    >
      <AuroraHeader config={config} slug={slug} hasHero={hasHero} />

      <main>
        {(() => {
          let propertySectionRendered = false;
          return visibleSections.map((section) => {
            const isPropertySection =
              section.type === "featured" ||
              section.type === "all_properties" ||
              section.type === "search";
            if (isPropertySection) {
              if (propertySectionRendered) return null;
              propertySectionRendered = true;
            }

            switch (section.type) {
              case "hero":
                return (
                  <AuroraHero key={section.id} config={config} slug={slug} />
                );
              case "featured":
              case "all_properties":
              case "search":
                return (
                  <AuroraFeatured
                    key="properties"
                    config={config}
                    slug={slug}
                    properties={
                      section.type === "featured"
                        ? featuredOrAllProperties
                        : properties
                    }
                    sectionId="featured"
                    title={
                      section.type === "featured" &&
                      featuredProperties.length > 0
                        ? "Propriedades em Destaque"
                        : "Nossa Coleção"
                    }
                    subtitle={
                      section.type === "featured" &&
                      featuredProperties.length > 0
                        ? "Seleção Exclusiva"
                        : "Todos os Imóveis"
                    }
                    showAllLink
                  />
                );
              case "about":
                return <AuroraAbout key={section.id} config={config} />;
              case "testimonials":
                return <AuroraTestimonials key={section.id} config={config} />;
              case "contact":
                return <AuroraContact key={section.id} config={config} />;
              default:
                return null;
            }
          });
        })()}

        {!hasPropertySectionVisible && properties.length > 0 && (
          <AuroraFeatured
            key="fallback-properties"
            config={config}
            slug={slug}
            properties={properties}
            sectionId="featured"
            title="Nossa Coleção"
            subtitle="Todos os Imóveis"
            showAllLink
          />
        )}
      </main>

      <AuroraFooter config={config} slug={slug} />
      <AuroraWhatsAppButton config={config} />
      <GlassFilter />
    </div>
  );
}
