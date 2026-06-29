import type { StorefrontBuilderComponent } from "@lojaveiculosv2/shared";
import type { ReactNode } from "react";
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
import { BuilderBlockStyleEditor } from "./BuilderBlockStyleEditor";

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

  const withStyleEditor = (editor: ReactNode) => (
    <>
      {editor}
      <BuilderBlockStyleEditor component={component} onChange={onChange} />
    </>
  );

  if (component.type === "hero") {
    return withStyleEditor(<HeroBlockEditor props={props} setProp={setProp} />);
  }
  if (component.type === "about") {
    return withStyleEditor(
      <AboutBlockEditor props={props} setProp={setProp} />,
    );
  }
  if (component.type === "text_block") {
    return withStyleEditor(<TextBlockEditor props={props} setProp={setProp} />);
  }
  if (component.type === "image") {
    return withStyleEditor(
      <ImageBlockEditor props={props} setProp={setProp} />,
    );
  }
  if (component.type === "gallery") {
    return withStyleEditor(
      <GalleryBlockEditor props={props} setProp={setProp} />,
    );
  }
  if (component.type === "video") {
    return withStyleEditor(
      <VideoBlockEditor props={props} setProp={setProp} />,
    );
  }
  if (component.type === "testimonials") {
    return withStyleEditor(
      <TestimonialsBlockEditor props={props} setProp={setProp} />,
    );
  }
  if (component.type === "featured" || component.type === "properties_grid") {
    return withStyleEditor(
      <FeaturedVehiclesBlockEditor props={props} setProp={setProp} />,
    );
  }
  if (component.type === "cta") {
    return withStyleEditor(<CtaBlockEditor props={props} setProp={setProp} />);
  }
  if (component.type === "contact_section") {
    return withStyleEditor(
      <ContactSectionBlockEditor props={props} setProp={setProp} />,
    );
  }
  if (component.type === "typewriter") {
    return withStyleEditor(
      <TypewriterBlockEditor props={props} setProp={setProp} />,
    );
  }
  if (component.type === "header" || component.type === "footer") {
    return withStyleEditor(
      <HeaderFooterEditor component={component} setProp={setProp} />,
    );
  }
  if (
    component.type === "container" ||
    component.type === "section_wrapper" ||
    component.type === "two_column"
  ) {
    return (
      <>
        <NestedLayoutEditor
          component={component}
          renderNestedEditor={(child, updateChild) => (
            <BuilderBlockPropsEditor component={child} onChange={updateChild} />
          )}
          setChildren={setChildren}
          setProp={setProp}
        />
        <BuilderBlockStyleEditor component={component} onChange={onChange} />
      </>
    );
  }
  return withStyleEditor(
    <SimpleBlockEditor component={component} setProp={setProp} />,
  );
}
