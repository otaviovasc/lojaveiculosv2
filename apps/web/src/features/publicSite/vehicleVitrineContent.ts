import type { StorefrontBuilderComponent } from "@lojaveiculosv2/shared";
import { recordArrayProp, textProp } from "./pageBuilderRenderUtils";

type Components = readonly StorefrontBuilderComponent[] | undefined;

export function isVehicleVitrine(components: Components) {
  return (
    components?.some(
      (component) =>
        component.visible && component.props.pageVariant === "vehicle-vitrine",
    ) ?? false
  );
}

export function hasVitrineContact(components: Components) {
  return (
    components?.some(
      (component) => component.visible && component.type === "contact_section",
    ) ?? false
  );
}

export function hasVitrineGallery(components: Components) {
  return (
    components?.some(
      (component) =>
        component.visible &&
        component.type === "gallery" &&
        recordArrayProp(component.props.images).some((image) =>
          textProp(image.url),
        ),
    ) ?? false
  );
}

export function hasVitrineSpecs(components: Components) {
  return (
    components?.some(
      (component) => component.visible && component.type === "vehicle_specs",
    ) ?? false
  );
}

// The public API owns the commercial condition. Only emphasize its complete,
// delimited prefix; preserve all remaining copy and never consult stored price props.
export function extractCommercialCondition(subtitle?: string | null): {
  commercialCondition: string | null;
  description: string | null;
} {
  const content = subtitle?.trim();
  if (!content) return { commercialCondition: null, description: null };
  const [prefix, ...details] = content.split(" · ");
  if (
    prefix &&
    (/^R\$[\s\u00a0]+\d{1,3}(?:\.\d{3})*(?:,\d{2})?$/.test(prefix) ||
      prefix === "Condição comercial sob consulta")
  ) {
    return {
      commercialCondition: prefix,
      description: details.join(" · ") || null,
    };
  }
  return { commercialCondition: null, description: content };
}
