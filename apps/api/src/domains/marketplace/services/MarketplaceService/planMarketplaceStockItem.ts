import type {
  MarketplaceCatalogMapping,
  MarketplaceListingProjection,
  MarketplaceProvider,
  MarketplaceProviderListing,
} from "../../ports/marketplaceRepository.js";
import { providerMapping } from "../marketplaceCatalogResolution.js";
import {
  isProviderRelevant,
  listListingBlockers,
  shouldUnpublish,
} from "./marketplaceStockPlanRules.js";
import type { MarketplaceStockPlanItem } from "./marketplaceStockPlanTypes.js";

export function planMarketplaceStockItem(input: {
  catalogMapping: MarketplaceCatalogMapping | null;
  connectionReady?: boolean;
  listing: MarketplaceListingProjection;
  origin?: "provider_only" | "stock";
  provider: MarketplaceProvider;
  providerListing: MarketplaceProviderListing | null;
}): MarketplaceStockPlanItem {
  const externalId = input.providerListing?.externalId ?? null;
  if (!isProviderRelevant(input.listing) && !externalId) {
    return item(input, {
      accountingStatus: "excluded",
      decision: "no_op",
      externalId,
      jobType: null,
      reason: excludedListingReason(input.listing),
      userAction: excludedListingAction(input.listing),
    });
  }
  if (shouldUnpublish(input.listing)) {
    return item(input, {
      accountingStatus: "excluded",
      decision: externalId ? "unpublish" : "no_op",
      externalId,
      jobType: externalId ? "listing_unpublish" : null,
      reason: "O anúncio está fora da publicação e ainda existe no canal.",
      userAction: "Envie o lote para remover o anúncio do canal.",
    });
  }

  const blockers = listListingBlockers(
    input.listing,
    input.catalogMapping,
    input.provider,
    input.connectionReady ?? true,
  );
  if (blockers.length) {
    return item(input, {
      accountingStatus: "needs_correction",
      blockers,
      decision: "blocked",
      externalId,
      jobType: null,
      reason: "O veículo precisa de correções antes de ser enviado ao canal.",
      userAction: null,
    });
  }

  return item(input, {
    accountingStatus: "ready",
    decision: externalId ? "update" : "publish",
    externalId,
    jobType: externalId ? "listing_update" : "listing_publish",
    reason: externalId
      ? "O anúncio está pronto para ser atualizado no canal."
      : "O veículo está pronto para ser publicado no canal.",
    userAction: externalId
      ? "Envie o lote para atualizar o anúncio."
      : "Envie o lote para publicar o anúncio.",
  });
}

function item(
  input: Parameters<typeof planMarketplaceStockItem>[0],
  fields: Pick<
    MarketplaceStockPlanItem,
    | "accountingStatus"
    | "decision"
    | "externalId"
    | "jobType"
    | "reason"
    | "userAction"
  > &
    Partial<Pick<MarketplaceStockPlanItem, "blockers">>,
): MarketplaceStockPlanItem {
  return {
    blockers: [],
    listing: input.listing,
    origin: input.origin ?? "stock",
    provider: input.provider,
    providerMapping: providerMapping(input.catalogMapping, input.provider),
    ...fields,
  };
}

function excludedListingReason(listing: MarketplaceListingProjection) {
  if (!listing.isVisibleOnPublicSite) {
    return "O anúncio está privado na vitrine da loja.";
  }
  const reasons: Record<MarketplaceListingProjection["status"], string> = {
    archived: "O anúncio está arquivado.",
    draft: "O anúncio está em rascunho.",
    in_preparation: "O veículo ainda está em preparação.",
    published: "O anúncio está fora da publicação deste canal.",
    sold_out: "O veículo está marcado como vendido.",
    unpublished: "O anúncio está despublicado.",
  };
  return reasons[listing.status];
}

function excludedListingAction(listing: MarketplaceListingProjection) {
  if (listing.status === "sold_out" || listing.status === "archived") {
    return null;
  }
  if (listing.status === "in_preparation") {
    return "Conclua a preparação e publique o anúncio na vitrine da loja.";
  }
  return "Publique o anúncio e habilite a visibilidade na vitrine da loja.";
}
