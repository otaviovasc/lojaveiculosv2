import type { StorefrontBuilderComponent } from "@lojaveiculosv2/shared";
import {
  AboutBlockEditor,
  GalleryBlockEditor,
  HeroBlockEditor,
  ImageBlockEditor,
  TextBlockEditor,
  VideoBlockEditor,
} from "./BuilderBasicBlockEditors";
import {
  ContactSectionBlockEditor,
  CtaBlockEditor,
  FeaturedVehiclesBlockEditor,
  TestimonialsBlockEditor,
  TypewriterBlockEditor,
} from "./BuilderMarketingBlockEditors";
import {
  HeaderFooterEditor,
  NestedLayoutEditor,
  SimpleBlockEditor,
} from "./BuilderStructureBlockEditors";

export function BuilderBlockPropsEditor({
  component,
  onChange,
}: {
  component: StorefrontBuilderComponent;
  onChange: (component: StorefrontBuilderComponent) => void;
}) {
  const props = component.props;
  const setProp = (key: string, value: unknown) =>
    onChange({ ...component, props: { ...props, [key]: value } });
  const setChildren = (key: string, value: StorefrontBuilderComponent[]) =>
    setProp(
      key,
      value.map((child, order) => ({ ...child, order })),
    );

  if (component.type === "hero") {
    return <HeroBlockEditor props={props} setProp={setProp} />;
  }
  if (component.type === "about") {
    return <AboutBlockEditor props={props} setProp={setProp} />;
  }
  if (component.type === "text_block") {
    return <TextBlockEditor props={props} setProp={setProp} />;
  }
  if (component.type === "image") {
    return <ImageBlockEditor props={props} setProp={setProp} />;
  }
  if (component.type === "gallery") {
    return <GalleryBlockEditor props={props} setProp={setProp} />;
  }
  if (component.type === "video") {
    return <VideoBlockEditor props={props} setProp={setProp} />;
  }
  if (component.type === "testimonials") {
    return <TestimonialsBlockEditor props={props} setProp={setProp} />;
  }
  if (component.type === "featured" || component.type === "properties_grid") {
    return <FeaturedVehiclesBlockEditor props={props} setProp={setProp} />;
  }
  if (component.type === "cta") {
    return <CtaBlockEditor props={props} setProp={setProp} />;
  }
  if (component.type === "contact_section") {
    return <ContactSectionBlockEditor props={props} setProp={setProp} />;
  }
  if (component.type === "typewriter") {
    return <TypewriterBlockEditor props={props} setProp={setProp} />;
  }
  if (component.type === "header" || component.type === "footer") {
    return <HeaderFooterEditor component={component} setProp={setProp} />;
  }
  if (
    component.type === "container" ||
    component.type === "section_wrapper" ||
    component.type === "two_column"
  ) {
    return (
      <NestedLayoutEditor
        component={component}
        renderNestedEditor={(child, updateChild) => (
          <BuilderBlockPropsEditor component={child} onChange={updateChild} />
        )}
        setChildren={setChildren}
        setProp={setProp}
      />
    );
  }
  return <SimpleBlockEditor component={component} setProp={setProp} />;
}
