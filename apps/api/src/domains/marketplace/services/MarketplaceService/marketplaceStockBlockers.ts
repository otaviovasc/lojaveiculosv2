import type { MarketplaceCatalogSnapshot } from "../../ports/marketplaceRepository.js";
import type {
  MarketplaceBlockerLayer,
  MarketplaceListingBlocker,
  MarketplaceListingBlockerCode,
} from "./marketplaceStockPlanTypes.js";

type CatalogRequiredField = keyof Omit<
  MarketplaceCatalogSnapshot,
  "fuel" | "referenceMonth" | "source"
>;
type TechnicalField = "doors" | "fuelType" | "mileageKm";

export function catalogFieldBlocker(
  field: CatalogRequiredField,
): MarketplaceListingBlocker {
  return createMarketplaceListingBlocker(
    "MARKETPLACE_LISTING_CATALOG_FIELD_MISSING",
    `catalog.${field}`,
    catalogFieldMessages[field],
    catalogFieldActions[field],
  );
}

export function createMarketplaceListingBlocker(
  code: MarketplaceListingBlockerCode,
  field: string,
  message = messages[code],
  userAction = actions[code],
): MarketplaceListingBlocker {
  return {
    code,
    field,
    layer: blockerLayers[code],
    message,
    userAction,
  };
}

export function technicalFieldBlocker(
  field: TechnicalField,
): MarketplaceListingBlocker {
  return createMarketplaceListingBlocker(
    "MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING",
    field,
    technicalFieldMessages[field],
    technicalFieldActions[field],
  );
}

const blockerLayers: Record<
  MarketplaceListingBlockerCode,
  MarketplaceBlockerLayer
> = {
  MARKETPLACE_LISTING_CATALOG_FIELD_MISSING: "catalog",
  MARKETPLACE_LISTING_CONTACT_PHONE_MISSING: "store",
  MARKETPLACE_LISTING_FIPE_CATALOG_MISSING: "catalog",
  MARKETPLACE_LISTING_LICENSE_PLATE_MISSING: "listing",
  MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING: "store",
  MARKETPLACE_LISTING_MAPPING_REQUIRED: "provider",
  MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS: "listing",
  MARKETPLACE_LISTING_NOT_PUBLIC: "listing",
  MARKETPLACE_LISTING_OLX_NOT_QUERIED: "provider",
  MARKETPLACE_LISTING_PHOTOS_INVALID: "listing",
  MARKETPLACE_LISTING_PRICE_MISSING: "listing",
  MARKETPLACE_LISTING_PROVIDER_NOT_QUERIED: "connection",
  MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING: "listing",
  MARKETPLACE_LISTING_TEXT_INVALID: "listing",
};

const messages: Record<MarketplaceListingBlockerCode, string> = {
  MARKETPLACE_LISTING_CATALOG_FIELD_MISSING: "Campo da FIPE ausente.",
  MARKETPLACE_LISTING_CONTACT_PHONE_MISSING:
    "Telefone da loja ausente ou inválido para OLX.",
  MARKETPLACE_LISTING_FIPE_CATALOG_MISSING: "Anúncio sem catálogo FIPE.",
  MARKETPLACE_LISTING_LICENSE_PLATE_MISSING:
    "Placa da unidade selecionada ausente ou inválida para OLX.",
  MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING:
    "CEP da loja ausente ou inválido para OLX.",
  MARKETPLACE_LISTING_MAPPING_REQUIRED:
    "Mapeamento do catálogo FIPE com o provedor pendente.",
  MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS: "Anuncio sem fotos publicas.",
  MARKETPLACE_LISTING_NOT_PUBLIC: "Anuncio nao publicado no site publico.",
  MARKETPLACE_LISTING_OLX_NOT_QUERIED:
    "OLX não consultada porque a identidade FIPE está incompleta.",
  MARKETPLACE_LISTING_PHOTOS_INVALID:
    "A OLX aceita de 1 a 20 fotos públicas, sem URLs vazias ou repetidas.",
  MARKETPLACE_LISTING_PRICE_MISSING: "Preço do anúncio ausente.",
  MARKETPLACE_LISTING_PROVIDER_NOT_QUERIED:
    "O canal não foi consultado porque a conexão não está pronta.",
  MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING:
    "Campo técnico obrigatório ausente.",
  MARKETPLACE_LISTING_TEXT_INVALID:
    "Título ou descrição fora dos limites aceitos pela OLX.",
};

const actions: Record<MarketplaceListingBlockerCode, string> = {
  MARKETPLACE_LISTING_CATALOG_FIELD_MISSING:
    "Complete marca, modelo, versão e ano FIPE.",
  MARKETPLACE_LISTING_CONTACT_PHONE_MISSING:
    "Cadastre WhatsApp ou telefone válido no perfil da loja.",
  MARKETPLACE_LISTING_FIPE_CATALOG_MISSING:
    "Selecione a versão FIPE do veículo.",
  MARKETPLACE_LISTING_LICENSE_PLATE_MISSING:
    "Cadastre uma placa válida na unidade selecionada antes de sincronizar com OLX.",
  MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING:
    "Cadastre um CEP válido no perfil da loja.",
  MARKETPLACE_LISTING_MAPPING_REQUIRED:
    "Revise a identidade FIPE e gere uma nova prévia.",
  MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS: "Adicione pelo menos uma foto pública.",
  MARKETPLACE_LISTING_NOT_PUBLIC:
    "Publique o anúncio e habilite a visibilidade pública.",
  MARKETPLACE_LISTING_OLX_NOT_QUERIED:
    "Complete a identidade FIPE e gere uma nova prévia.",
  MARKETPLACE_LISTING_PHOTOS_INVALID:
    "Mantenha no máximo 20 fotos públicas e remova URLs vazias ou repetidas.",
  MARKETPLACE_LISTING_PRICE_MISSING: "Informe o preço de venda.",
  MARKETPLACE_LISTING_PROVIDER_NOT_QUERIED:
    "Revise a conexão e as permissões do canal.",
  MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING:
    "Complete combustível, portas e quilometragem.",
  MARKETPLACE_LISTING_TEXT_INVALID:
    "Informe título e descrição com pelo menos 2 caracteres.",
};

const catalogFieldMessages: Record<CatalogRequiredField, string> = {
  brandCode: "Catálogo FIPE incompleto: falta o código da marca.",
  brandName: "Catálogo FIPE incompleto: falta o nome da marca.",
  fipeCode: "Catálogo FIPE incompleto: falta o código FIPE.",
  modelCode: "Catálogo FIPE incompleto: falta o código do modelo.",
  modelName: "Catálogo FIPE incompleto: falta o nome do modelo.",
  modelYear: "Catálogo FIPE incompleto: falta o ano do modelo.",
  vehicleType: "Catálogo FIPE incompleto: falta o tipo do veículo.",
  yearCode: "Catálogo FIPE incompleto: falta o código do ano.",
  yearName: "Catálogo FIPE incompleto: falta a descrição do ano.",
};

const catalogFieldActions: typeof catalogFieldMessages = {
  brandCode: "Resolva novamente a marca no cadastro FIPE do veículo.",
  brandName: "Resolva novamente a marca no cadastro FIPE do veículo.",
  fipeCode: "Selecione a versão FIPE completa do veículo.",
  modelCode: "Selecione o modelo correto no cadastro FIPE do veículo.",
  modelName: "Selecione o modelo correto no cadastro FIPE do veículo.",
  modelYear: "Selecione o ano correto no cadastro FIPE do veículo.",
  vehicleType: "Selecione o tipo correto no cadastro FIPE do veículo.",
  yearCode: "Selecione o ano correto no cadastro FIPE do veículo.",
  yearName: "Selecione o ano correto no cadastro FIPE do veículo.",
};

const technicalFieldMessages: Record<TechnicalField, string> = {
  doors: "Anúncio incompleto: falta a quantidade de portas.",
  fuelType: "Anúncio incompleto: falta o tipo de combustível.",
  mileageKm: "Anúncio incompleto: falta a quilometragem.",
};

const technicalFieldActions: typeof technicalFieldMessages = {
  doors: "Informe a quantidade de portas do veículo.",
  fuelType: "Informe o tipo de combustível do veículo.",
  mileageKm: "Informe a quilometragem do veículo.",
};
