"use client";

import { GlassFilter } from "@/components/ui/glass-filter";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { TemplateProps } from "../registry";
import { QuadraAbout } from "./QuadraAbout";
import { QuadraContact } from "./QuadraContact";
import { QuadraFeatured } from "./QuadraFeatured";
import { QuadraFooter } from "./QuadraFooter";
import { QuadraHeader } from "./QuadraHeader";
import { QuadraHero } from "./QuadraHero";
import { QuadraTestimonials } from "./QuadraTestimonials";
import { QuadraWhatsAppButton } from "./QuadraWhatsAppButton";

export default function QuadraTemplate({
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

  const visibleSections = config.sections
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order);
  const featuredProperties = properties.filter((p) => p.featured);
  const featuredOrAllProperties =
    featuredProperties.length > 0 ? featuredProperties : properties;
  const hasPropertySectionVisible = visibleSections.some(
    (section) =>
      section.type === "featured" ||
      section.type === "all_properties" ||
      section.type === "search",
  );
  const hasHero = visibleSections.some((s) => s.type === "hero");

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={
        {
          "--quadra-brand": config.brandColor,
          "--quadra-accent": config.accentColor,
          "--quadra-bg": config.backgroundColor,
          backgroundColor: config.backgroundColor,
          fontFamily: `"${config.fonts.body}", sans-serif`,
        } as React.CSSProperties
      }
    >
      <QuadraHeader config={config} slug={slug} hasHero={hasHero} />

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
                  <QuadraHero key={section.id} config={config} slug={slug} />
                );
              case "featured":
              case "all_properties":
              case "search":
                return (
                  <QuadraFeatured
                    key="properties"
                    config={config}
                    slug={slug}
                    properties={
                      section.type === "featured"
                        ? featuredOrAllProperties
                        : properties
                    }
                    sectionId="properties"
                    title={
                      section.type === "featured" &&
                      featuredProperties.length > 0
                        ? "Minha seleção"
                        : "Todos os"
                    }
                    accentWord={
                      section.type === "featured" &&
                      featuredProperties.length > 0
                        ? "especial"
                        : "imóveis"
                    }
                    showAllLink
                  />
                );
              case "about":
                return <QuadraAbout key={section.id} config={config} />;
              case "testimonials":
                return <QuadraTestimonials key={section.id} config={config} />;
              case "contact":
                return <QuadraContact key={section.id} config={config} />;
              default:
                return null;
            }
          });
        })()}

        {!hasPropertySectionVisible && properties.length > 0 && (
          <QuadraFeatured
            key="fallback-properties"
            config={config}
            slug={slug}
            properties={properties}
            sectionId="properties"
            title="Todos os"
            accentWord="imóveis"
            showAllLink={false}
          />
        )}
      </main>

      <QuadraFooter config={config} slug={slug} />
      <QuadraWhatsAppButton config={config} />
      <GlassFilter />
    </div>
  );
}
