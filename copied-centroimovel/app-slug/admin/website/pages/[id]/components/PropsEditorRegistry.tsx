"use client";

import { StyleEditor } from "@/modules/storefront/components/builder/StyleEditor";
import {
  AboutEditor,
  ContactSectionEditor,
  ContainerEditor,
  CTAEditor,
  DividerEditor,
  FooterEditor,
  GalleryEditor,
  HeaderEditor,
  HeroEditor,
  ImageEditor,
  MapEditor,
  MarqueeEditor,
  PropertyGridEditor,
  SectionWrapperEditor,
  SpacerEditor,
  TestimonialsEditor,
  TextBlockEditor,
  TwoColumnEditor,
  TypewriterEditor,
  VideoEditor,
  type PropsEditorProps,
} from "./index";

interface PropsEditorRegistryProps extends PropsEditorProps {
  type: string;
  properties?: Array<{ id: string; title: string }>;
  workspaceSlug?: string;
}

export function PropsEditorRegistry({
  type,
  props,
  onChange,
  properties,
  workspaceSlug,
}: PropsEditorRegistryProps) {
  const editorProps: PropsEditorProps = { props, onChange };

  const renderComponentEditor = () => {
    switch (type) {
      case "hero":
        return <HeroEditor {...editorProps} workspaceSlug={workspaceSlug} />;
      case "about":
        return <AboutEditor {...editorProps} workspaceSlug={workspaceSlug} />;
      case "text_block":
        return (
          <TextBlockEditor {...editorProps} workspaceSlug={workspaceSlug} />
        );
      case "image":
        return <ImageEditor {...editorProps} workspaceSlug={workspaceSlug} />;
      case "gallery":
        return <GalleryEditor {...editorProps} workspaceSlug={workspaceSlug} />;
      case "video":
        return <VideoEditor {...editorProps} workspaceSlug={workspaceSlug} />;
      case "testimonials":
        return <TestimonialsEditor {...editorProps} />;
      case "featured":
      case "properties_grid":
        return <PropertyGridEditor {...editorProps} properties={properties} />;
      case "cta":
        return <CTAEditor {...editorProps} workspaceSlug={workspaceSlug} />;
      case "spacer":
        return <SpacerEditor {...editorProps} />;
      case "divider":
        return <DividerEditor {...editorProps} />;
      case "map":
        return <MapEditor {...editorProps} />;
      case "container":
        return (
          <ContainerEditor
            {...editorProps}
            workspaceSlug={workspaceSlug}
            properties={properties}
          />
        );
      case "two_column":
        return (
          <TwoColumnEditor
            {...editorProps}
            workspaceSlug={workspaceSlug}
            properties={properties}
          />
        );
      case "section_wrapper":
        return (
          <SectionWrapperEditor
            {...editorProps}
            workspaceSlug={workspaceSlug}
            properties={properties}
          />
        );
      case "contact_section":
        return <ContactSectionEditor {...editorProps} />;
      case "marquee":
        return <MarqueeEditor {...editorProps} workspaceSlug={workspaceSlug} />;
      case "header":
        return <HeaderEditor {...editorProps} />;
      case "footer":
        return <FooterEditor {...editorProps} />;
      case "typewriter":
        return <TypewriterEditor {...editorProps} />;
      default:
        return (
          <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
            Nenhum editor disponível para este componente
          </div>
        );
    }
  };

  const componentStyle = (props.style as Record<string, unknown>) || {};
  const hasStyleEditor = ![
    "spacer",
    "divider",
    "section_wrapper",
    "container",
    "two_column",
    "text_block",
    "gallery",
  ].includes(type);

  return (
    <div className="space-y-4">
      {renderComponentEditor()}
      {hasStyleEditor && (
        <StyleEditor
          style={componentStyle}
          onChange={(newStyle) => onChange({ ...props, style: newStyle })}
          workspaceSlug={workspaceSlug}
          componentType={type}
        />
      )}
    </div>
  );
}
