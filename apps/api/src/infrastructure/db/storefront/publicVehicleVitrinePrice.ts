import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";

const visibleCurrencyPattern = /R\$[\s\u00a0]*\d[\d.]*(?:,\d{2})?/gi;
const encodedCurrencyPattern =
  /R%24(?:(?:%C2%A0)|(?:%20)|\+)*\d{1,3}(?:(?:\.|%2E)\d{3})*(?:(?:,|%2C)\d{2})?/gi;
const leadingPricePlaceholderPattern =
  /^Condi[cç][aã]o comercial sob consulta/i;
const metadataRedaction = "Valor sob consulta";

export function applyPublicVehicleVitrinePrice(
  page: StorefrontCustomPage,
  priceCents: number | null,
  sourceAskingPriceCents: number | null = priceCents,
): StorefrontCustomPage {
  const price = formatPublicPrice(priceCents);
  const encodedPrice = encodeURIComponent(price);
  const sourcePrice =
    sourceAskingPriceCents === null
      ? null
      : formatPublicPrice(sourceAskingPriceCents);
  const encodedSourcePrice = sourcePrice
    ? encodeURIComponent(sourcePrice)
    : null;
  const description = redactMetadataPrice(page.description);
  const seo = redactSeoPrice(page.seo);
  return {
    ...page,
    components: page.components.map((component) =>
      projectKnownPriceFields(
        component,
        price,
        encodedPrice,
        sourcePrice,
        encodedSourcePrice,
      ),
    ),
    ...(description !== undefined ? { description } : {}),
    ...(seo !== undefined ? { seo } : {}),
    title: redactMetadataPrice(page.title) ?? page.title,
  };
}

export function isVehicleVitrinePage(page: StorefrontCustomPage) {
  return page.components.some(
    (component) => component.props.pageVariant === "vehicle-vitrine",
  );
}

export function hasRequiredVehicleVitrineBinding(page: StorefrontCustomPage) {
  return !isVehicleVitrinePage(page) || Boolean(page.sourceListingId);
}

function projectKnownPriceFields(
  component: StorefrontCustomPage["components"][number],
  price: string,
  encodedPrice: string,
  sourcePrice: string | null,
  encodedSourcePrice: string | null,
): StorefrontCustomPage["components"][number] {
  if (
    component.type !== "hero" ||
    component.props.pageVariant !== "vehicle-vitrine"
  ) {
    return component;
  }
  const subtitle = component.props.subtitle;
  const ctaUrl = component.props.ctaUrl;
  return {
    ...component,
    props: {
      ...component.props,
      ...(typeof ctaUrl === "string"
        ? {
            ctaUrl: encodedSourcePrice
              ? replaceFirstExactPrice(ctaUrl, encodedSourcePrice, encodedPrice)
              : ctaUrl,
          }
        : {}),
      ...(typeof subtitle === "string"
        ? {
            subtitle: (sourcePrice
              ? replaceFirstExactPrice(subtitle, sourcePrice, price)
              : subtitle
            ).replace(leadingPricePlaceholderPattern, price),
          }
        : {}),
    },
  };
}

function replaceFirstExactPrice(
  value: string,
  sourcePrice: string,
  replacement: string,
) {
  const candidates = [
    sourcePrice,
    sourcePrice.replace(/\u00a0/g, " "),
    sourcePrice.replace(/%C2%A0/gi, "%20"),
    sourcePrice.replace(/%C2%A0/gi, "+"),
  ];
  for (const candidate of candidates) {
    const index = value.indexOf(candidate);
    if (index >= 0) {
      return `${value.slice(0, index)}${replacement}${value.slice(index + candidate.length)}`;
    }
  }
  return value;
}

function redactMetadataPrice(value: string | null | undefined) {
  if (typeof value !== "string") return value;
  return value
    .replace(visibleCurrencyPattern, metadataRedaction)
    .replace(encodedCurrencyPattern, encodeURIComponent(metadataRedaction));
}

function redactSeoPrice(seo: StorefrontCustomPage["seo"]) {
  if (!seo) return seo;
  const metaDescription = redactMetadataPrice(seo.metaDescription);
  const metaTitle = redactMetadataPrice(seo.metaTitle);
  return {
    ...seo,
    ...(metaDescription !== undefined ? { metaDescription } : {}),
    ...(metaTitle !== undefined ? { metaTitle } : {}),
  };
}

function formatPublicPrice(priceCents: number | null) {
  if (priceCents === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(priceCents / 100);
}
