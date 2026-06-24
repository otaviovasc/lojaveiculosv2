import type {
  CreateInventoryFlowInput,
  CreateInventoryFlowResult,
  CreateInventoryCostInput,
  CreateInventoryListingInput,
  CreateInventoryMediaInput,
  CreateInventoryUnitInput,
  InventoryAuth,
  InventoryListingDetail,
  InventoryListingList,
  ReserveInventoryListingInput,
  SellInventoryListingInput,
  UpdateInventoryListingInput,
  UpdateInventoryUnitInput,
} from "../model/types";
import type {
  InventoryPlateLookupResponse,
  InventoryResaleAnalysisRequest,
  InventoryResaleAnalysisResponse,
} from "../model/enrichmentTypes";
import {
  createInventoryCatalogApi,
  type InventoryCatalogApi,
} from "./inventoryCatalogApi";
import {
  createInventoryMediaApi,
  type InventoryMediaApi,
} from "./inventoryMediaApi";
import {
  createInventoryHeaders,
  inventoryRoutes,
  type ListInventoryInput,
} from "./apiRoutes";
import {
  cleanJson,
  cleanMediaInput,
  readJson,
  readUpload,
  type JsonBody,
} from "./apiClientSupport";

export { createInventoryHeaders, inventoryRoutes } from "./apiRoutes";

export type InventoryApi = {
  attachUnit: (
    listingId: string,
    input: CreateInventoryUnitInput,
  ) => Promise<InventoryListingDetail>;
  addCost: (
    listingId: string,
    input: CreateInventoryCostInput,
  ) => Promise<InventoryListingDetail>;
  createFlow: (
    input: CreateInventoryFlowInput,
  ) => Promise<CreateInventoryFlowResult>;
  createListing: (
    input: CreateInventoryListingInput,
  ) => Promise<InventoryListingDetail>;
  getListing: (listingId: string) => Promise<InventoryListingDetail>;
  lookupPlate: (input: {
    plate: string;
  }) => Promise<InventoryPlateLookupResponse>;
  analyzeResale: (
    input: InventoryResaleAnalysisRequest,
  ) => Promise<InventoryResaleAnalysisResponse>;
  listListings: (input?: ListInventoryInput) => Promise<InventoryListingList>;
  reserveListing: (
    listingId: string,
    input: ReserveInventoryListingInput,
  ) => Promise<InventoryListingDetail>;
  sellListing: (
    listingId: string,
    input: SellInventoryListingInput,
  ) => Promise<InventoryListingDetail>;
  updateListingDetails: (
    listingId: string,
    input: UpdateInventoryListingInput,
  ) => Promise<InventoryListingDetail>;
  updateUnit: (
    listingId: string,
    unitId: string,
    input: UpdateInventoryUnitInput,
  ) => Promise<InventoryListingDetail>;
} & InventoryCatalogApi &
  InventoryMediaApi;

export type CreateInventoryApiOptions = {
  auth?: InventoryAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createInventoryApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateInventoryApiOptions): InventoryApi {
  const sendJson = <T>(route: string, body: JsonBody, method = "POST") =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createInventoryHeaders(auth),
      method,
    }).then(readJson<T>);

  const postJson = <T>(route: string, body: JsonBody) =>
    sendJson<T>(route, body);

  const createListing = (input: CreateInventoryListingInput) =>
    postJson<InventoryListingDetail>(inventoryRoutes.listings(baseUrl), {
      description: input.description,
      catalog: input.catalog,
      manufactureYear: input.manufactureYear,
      modelYear: input.modelYear,
      plate: input.plate,
      priceCents: input.priceCents,
      status: input.status,
      title: input.title,
      trimName: input.trimName,
    });

  const attachUnit = (listingId: string, input: CreateInventoryUnitInput) =>
    sendJson<InventoryListingDetail>(
      inventoryRoutes.unit(listingId, baseUrl),
      {
        plate: input.plate,
        stockNumber: input.stockNumber,
        vin: input.vin,
      },
      "PUT",
    );

  const addCost = (listingId: string, input: CreateInventoryCostInput) =>
    postJson<InventoryListingDetail>(
      inventoryRoutes.costs(listingId, baseUrl),
      {
        amountCents: input.amountCents,
        costDate: input.costDate,
        description: input.description,
        kind: input.kind,
        unitId: input.unitId,
      },
    );

  const lookupPlate = (input: { plate: string }) =>
    postJson<InventoryPlateLookupResponse>(
      inventoryRoutes.plateLookup(baseUrl),
      input,
    );

  const analyzeResale = (input: InventoryResaleAnalysisRequest) =>
    postJson<InventoryResaleAnalysisResponse>(
      inventoryRoutes.resaleAnalysis(baseUrl),
      input,
    );

  const reserveListing = (
    listingId: string,
    input: ReserveInventoryListingInput,
  ) =>
    postJson<InventoryListingDetail>(
      inventoryRoutes.reserve(listingId, baseUrl),
      input,
    );

  const sellListing = (listingId: string, input: SellInventoryListingInput) =>
    postJson<InventoryListingDetail>(
      inventoryRoutes.sell(listingId, baseUrl),
      input,
    );

  const mediaApi = createInventoryMediaApi({
    auth,
    fetch,
    postJson,
    sendJson,
    ...(baseUrl !== undefined ? { baseUrl } : {}),
  });
  const catalogApi = createInventoryCatalogApi({
    auth,
    fetch,
    ...(baseUrl !== undefined ? { baseUrl } : {}),
  });

  const getListing = (listingId: string) =>
    fetch(inventoryRoutes.detail(listingId, baseUrl), {
      headers: createInventoryHeaders(auth),
    }).then(readJson<InventoryListingDetail>);

  const listListings = (input: ListInventoryInput = {}) =>
    fetch(inventoryRoutes.list(input, baseUrl), {
      headers: createInventoryHeaders(auth),
    }).then(readJson<InventoryListingList>);

  const updateListingDetails = (
    listingId: string,
    input: UpdateInventoryListingInput,
  ) =>
    sendJson<InventoryListingDetail>(
      inventoryRoutes.detail(listingId, baseUrl),
      {
        description: input.description,
        catalog: input.catalog,
        manufactureYear: input.manufactureYear,
        modelYear: input.modelYear,
        priceCents: input.priceCents,
        status: input.status,
        title: input.title,
        trimName: input.trimName,
      },
      "PATCH",
    );

  const updateUnit = (
    listingId: string,
    unitId: string,
    input: UpdateInventoryUnitInput,
  ) =>
    sendJson<InventoryListingDetail>(
      inventoryRoutes.unitDetail(listingId, unitId, baseUrl),
      {
        plate: input.plate,
        status: input.status,
        stockNumber: input.stockNumber,
        vin: input.vin,
      },
      "PATCH",
    );

  return {
    addCost,
    analyzeResale,
    attachUnit,
    createFlow: async (input) => {
      const listing = await createListing(input.listing);
      const listingId = listing.listing.id;
      const unit = await attachUnit(listingId, input.unit);

      if (!input.media) return { listing, unit };

      const upload = await mediaApi.requestMediaUpload(listingId, input.media);
      await fetch(upload.uploadUrl, {
        body: input.media.file,
        headers: upload.uploadHeaders,
        method: upload.uploadMethod,
      }).then(readUpload);
      const media = await mediaApi.createMedia(
        listingId,
        cleanMediaInput(input.media, upload.storageKey),
      );

      return { listing, media, unit, upload };
    },
    createListing,
    getListing,
    lookupPlate,
    ...catalogApi,
    listListings,
    ...mediaApi,
    reserveListing,
    sellListing,
    updateListingDetails,
    updateUnit,
  };
}
