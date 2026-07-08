import type {
  MarketplaceCatalogMapping,
  MarketplaceCatalogSnapshot,
  MarketplaceListingProjection,
  MarketplaceProvider,
} from "../../ports/marketplaceRepository.js";
import type {
  MarketplaceListingBlocker,
  MarketplaceListingBlockerCode,
} from "./marketplaceStockPlanTypes.js";

export function listListingBlockers(
  listing: MarketplaceListingProjection,
  catalogMapping: MarketplaceCatalogMapping | null,
  provider: MarketplaceProvider = "mercado_livre",
): MarketplaceListingBlocker[] {
  const blockers: MarketplaceListingBlocker[] = [];
  if (listing.status !== "published" || !listing.isVisibleOnPublicSite) {
    blockers.push(blocker("MARKETPLACE_LISTING_NOT_PUBLIC", "status"));
  }
  if (!listing.mediaUrls.length) {
    blockers.push(blocker("MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS", "media"));
  }
  if (!listing.priceCents || listing.priceCents <= 0) {
    blockers.push(blocker("MARKETPLACE_LISTING_PRICE_MISSING", "priceCents"));
  }
  blockers.push(...catalogBlockers(listing.catalog));
  for (const field of ["fuelType", "doors", "mileageKm"] as const) {
    if (listing[field] === null) {
      blockers.push(
        blocker("MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING", field),
      );
    }
  }
  if (mappingRequired(listing.catalog, catalogMapping)) {
    blockers.push(blocker("MARKETPLACE_LISTING_MAPPING_REQUIRED", "catalog"));
  }
  if (provider === "olx") blockers.push(...olxBlockers(listing));
  return blockers;
}

export function shouldUnpublish(listing: MarketplaceListingProjection) {
  return (
    listing.status === "archived" ||
    listing.status === "draft" ||
    listing.status === "in_preparation" ||
    listing.status === "sold_out" ||
    listing.status === "unpublished" ||
    !listing.isVisibleOnPublicSite
  );
}

export function isProviderRelevant(listing: MarketplaceListingProjection) {
  return listing.status === "published" && listing.isVisibleOnPublicSite;
}

export function isCompleteCatalog(catalog: MarketplaceCatalogSnapshot) {
  return Boolean(
    catalog.brandCode &&
    catalog.brandName &&
    catalog.fipeCode &&
    catalog.modelCode &&
    catalog.modelName &&
    catalog.modelYear &&
    catalog.vehicleType &&
    catalog.yearCode &&
    catalog.yearName,
  );
}

function catalogBlockers(
  catalog: MarketplaceCatalogSnapshot | null,
): MarketplaceListingBlocker[] {
  if (!catalog || catalog.source !== "fipe") {
    return [blocker("MARKETPLACE_LISTING_FIPE_CATALOG_MISSING", "catalog")];
  }
  const blockers: MarketplaceListingBlocker[] = [];
  for (const field of [
    "brandCode",
    "brandName",
    "fipeCode",
    "modelCode",
    "modelName",
    "modelYear",
    "vehicleType",
    "yearCode",
    "yearName",
  ] as const) {
    if (catalog[field] === null) {
      blockers.push(
        blocker(
          "MARKETPLACE_LISTING_CATALOG_FIELD_MISSING",
          `catalog.${field}`,
        ),
      );
    }
  }
  return blockers;
}

function mappingRequired(
  catalog: MarketplaceCatalogSnapshot | null,
  mapping: MarketplaceCatalogMapping | null,
) {
  if (!catalog || catalog.source !== "fipe") return false;
  if (!isCompleteCatalog(catalog)) return false;
  return (
    !mapping ||
    mapping.status !== "resolved" ||
    !mapping.providerBrandCode ||
    !mapping.providerModelCode ||
    !mapping.providerTrimCode ||
    !mapping.providerYearCode
  );
}

function olxBlockers(
  listing: MarketplaceListingProjection,
): MarketplaceListingBlocker[] {
  const blockers: MarketplaceListingBlocker[] = [];
  if (!validOlxPhone(listing.contactPhone)) {
    blockers.push(
      blocker("MARKETPLACE_LISTING_CONTACT_PHONE_MISSING", "contactPhone"),
    );
  }
  if (!validOlxZipCode(listing.locationZipCode)) {
    blockers.push(
      blocker(
        "MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING",
        "locationZipCode",
      ),
    );
  }
  if (
    listing.condition !== "new" &&
    !validBrazilianPlate(listing.licensePlate)
  ) {
    blockers.push(
      blocker("MARKETPLACE_LISTING_LICENSE_PLATE_MISSING", "licensePlate"),
    );
  }
  return blockers;
}

function validOlxPhone(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  const withoutCountryCode =
    digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return /^\d{10,11}$/.test(withoutCountryCode);
}

function validOlxZipCode(value: string | null) {
  return /^\d{8}$/.test(value?.replace(/\D/g, "") ?? "");
}

function validBrazilianPlate(value: string | null) {
  const plate = value?.replace(/[^A-Za-z0-9]/g, "").toUpperCase() ?? "";
  return /^[A-Z]{3}\d{4}$/.test(plate) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate);
}

function blocker(
  code: MarketplaceListingBlockerCode,
  field: string,
): MarketplaceListingBlocker {
  return {
    code,
    field,
    message: messages[code],
    userAction: actions[code],
  };
}

const messages: Record<MarketplaceListingBlockerCode, string> = {
  MARKETPLACE_LISTING_CATALOG_FIELD_MISSING: "Campo da FIPE ausente.",
  MARKETPLACE_LISTING_CONTACT_PHONE_MISSING:
    "Telefone da loja ausente ou invalido para OLX.",
  MARKETPLACE_LISTING_FIPE_CATALOG_MISSING: "Anuncio sem catalogo FIPE.",
  MARKETPLACE_LISTING_LICENSE_PLATE_MISSING:
    "Placa da unidade selecionada ausente ou invalida para OLX.",
  MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING:
    "CEP da loja ausente ou invalido para OLX.",
  MARKETPLACE_LISTING_MAPPING_REQUIRED:
    "Mapeamento do catalogo FIPE com o provedor pendente.",
  MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS: "Anuncio sem fotos publicas.",
  MARKETPLACE_LISTING_NOT_PUBLIC: "Anuncio nao publicado no site publico.",
  MARKETPLACE_LISTING_PRICE_MISSING: "Preco do anuncio ausente.",
  MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING:
    "Campo tecnico obrigatorio ausente.",
};

const actions: Record<MarketplaceListingBlockerCode, string> = {
  MARKETPLACE_LISTING_CATALOG_FIELD_MISSING:
    "Complete marca, modelo, versao e ano FIPE.",
  MARKETPLACE_LISTING_CONTACT_PHONE_MISSING:
    "Cadastre WhatsApp ou telefone valido no perfil da loja.",
  MARKETPLACE_LISTING_FIPE_CATALOG_MISSING:
    "Selecione a versao FIPE do veiculo.",
  MARKETPLACE_LISTING_LICENSE_PLATE_MISSING:
    "Cadastre uma placa valida na unidade selecionada antes de sincronizar com OLX.",
  MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING:
    "Cadastre um CEP valido no perfil da loja.",
  MARKETPLACE_LISTING_MAPPING_REQUIRED:
    "Resolva o mapeamento do catalogo do provedor.",
  MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS: "Adicione pelo menos uma foto publica.",
  MARKETPLACE_LISTING_NOT_PUBLIC:
    "Publique o anuncio e habilite a visibilidade publica.",
  MARKETPLACE_LISTING_PRICE_MISSING: "Informe o preco de venda.",
  MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING:
    "Complete combustivel, portas e quilometragem.",
};
