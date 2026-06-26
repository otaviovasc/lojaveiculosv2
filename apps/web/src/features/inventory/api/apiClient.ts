import type {
  CreateInventoryChecklistInput,
  CreateInventoryCostInput,
  CreateInventoryListingInput,
  CreateInventoryMediaInput,
  CreateInventoryUnitInput,
  InventoryChecklist,
  InventoryListingDetail,
  InventoryListingList,
  ReserveInventoryListingInput,
  SellInventoryListingInput,
  UpdateInventoryChecklistInput,
  UpdateInventoryListingInput,
  UpdateInventoryUnitInput,
} from "../model/types";
import type {
  InventoryPlateLookupResponse,
  InventoryResaleAnalysisRequest,
  InventoryResaleAnalysisResponse,
} from "../model/enrichmentTypes";
import { createInventoryCatalogApi } from "./inventoryCatalogApi";
import { createInventoryMediaApi } from "./inventoryMediaApi";
import { createInventoryAcquisitionApi } from "./inventoryAcquisitionApi";
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
import type { CreateInventoryApiOptions, InventoryApi } from "./apiTypes";

export { createInventoryHeaders, inventoryRoutes } from "./apiRoutes";
export type { CreateInventoryApiOptions, InventoryApi } from "./apiTypes";

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
      doors: input.doors,
      engineAspiration: input.engineAspiration,
      engineDisplacement: input.engineDisplacement,
      fuelType: input.fuelType,
      internalNotes: input.internalNotes,
      manufactureYear: input.manufactureYear,
      mileageKm: input.mileageKm,
      modelYear: input.modelYear,
      plate: input.plate,
      priceCents: input.priceCents,
      status: input.status,
      title: input.title,
      transmission: input.transmission,
      trimName: input.trimName,
    });

  const attachUnit = (listingId: string, input: CreateInventoryUnitInput) =>
    sendJson<InventoryListingDetail>(
      inventoryRoutes.unit(listingId, baseUrl),
      {
        colorName: input.colorName,
        plate: input.plate,
        stockNumber: input.stockNumber,
        vin: input.vin,
      },
      "PUT",
    );

  const addCost = (unitId: string, input: CreateInventoryCostInput) =>
    postJson<InventoryListingDetail>(inventoryRoutes.costs(unitId, baseUrl), {
      amountCents: input.amountCents,
      costDate: input.costDate,
      description: input.description,
      kind: input.kind,
    });

  const createChecklist = (
    unitId: string,
    input: CreateInventoryChecklistInput,
  ) =>
    postJson<InventoryListingDetail>(
      inventoryRoutes.checklists(unitId, baseUrl),
      {
        items: input.items,
        name: input.name,
        status: input.status,
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

  const releaseReservation = (
    unitId: string,
    input: { reason?: string | null; saleId?: string | null },
  ) =>
    postJson<InventoryListingDetail>(
      inventoryRoutes.releaseReservation(unitId, baseUrl),
      input,
    );

  const reserveUnit = (unitId: string, input: ReserveInventoryListingInput) =>
    postJson<InventoryListingDetail>(
      inventoryRoutes.reserve(unitId, baseUrl),
      input,
    );

  const sellUnit = (unitId: string, input: SellInventoryListingInput) =>
    postJson<InventoryListingDetail>(
      inventoryRoutes.sell(unitId, baseUrl),
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
  const acquisitionApi = createInventoryAcquisitionApi({
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

  const listChecklists = (unitId: string) =>
    fetch(inventoryRoutes.checklists(unitId, baseUrl), {
      headers: createInventoryHeaders(auth),
    })
      .then(readJson<{ checklists: InventoryChecklist[] }>)
      .then((payload) => payload.checklists);

  const updateListingDetails = (
    listingId: string,
    input: UpdateInventoryListingInput,
  ) =>
    sendJson<InventoryListingDetail>(
      inventoryRoutes.detail(listingId, baseUrl),
      {
        description: input.description,
        catalog: input.catalog,
        doors: input.doors,
        engineAspiration: input.engineAspiration,
        engineDisplacement: input.engineDisplacement,
        fuelType: input.fuelType,
        internalNotes: input.internalNotes,
        manufactureYear: input.manufactureYear,
        mileageKm: input.mileageKm,
        modelYear: input.modelYear,
        priceCents: input.priceCents,
        status: input.status,
        title: input.title,
        transmission: input.transmission,
        trimName: input.trimName,
      },
      "PATCH",
    );

  const updateUnit = (unitId: string, input: UpdateInventoryUnitInput) =>
    sendJson<InventoryListingDetail>(
      inventoryRoutes.unitDetail(unitId, baseUrl),
      {
        colorName: input.colorName,
        plate: input.plate,
        status: input.status,
        stockNumber: input.stockNumber,
        vin: input.vin,
      },
      "PATCH",
    );

  const updateChecklist = (
    unitId: string,
    checklistId: string,
    input: UpdateInventoryChecklistInput,
  ) =>
    sendJson<InventoryListingDetail>(
      inventoryRoutes.checklistDetail(unitId, checklistId, baseUrl),
      {
        items: input.items,
        name: input.name,
        status: input.status,
      },
      "PATCH",
    );

  return {
    addCost,
    analyzeResale,
    attachUnit,
    createChecklist,
    createFlow: async (input) => {
      const listing = await createListing(input.listing);
      const listingId = listing.listing.id;
      const unitInputs = input.units?.length ? input.units : [input.unit];
      let unit = listing;

      for (const unitInput of unitInputs) {
        unit = await attachUnit(listingId, unitInput);
      }

      if (!input.media) return { listing, unit };
      if (unitInputs.length !== 1) {
        throw new Error(
          "Inventory media upload requires a single target unit in createFlow.",
        );
      }

      const unitId = unit.units.at(-1)?.id;
      if (!unitId) {
        throw new Error("Inventory media upload requires an attached unit.");
      }

      const upload = await mediaApi.requestMediaUpload(unitId, input.media);
      await fetch(upload.uploadUrl, {
        body: input.media.file,
        headers: upload.uploadHeaders,
        method: upload.uploadMethod,
      }).then(readUpload);
      const media = await mediaApi.createMedia(
        unitId,
        cleanMediaInput(input.media, upload.storageKey),
      );

      return { listing, media, unit, upload };
    },
    createListing,
    getListing,
    lookupPlate,
    ...acquisitionApi,
    ...catalogApi,
    listChecklists,
    listListings,
    ...mediaApi,
    releaseReservation,
    reserveUnit,
    sellUnit,
    updateChecklist,
    updateListingDetails,
    updateUnit,
  };
}
