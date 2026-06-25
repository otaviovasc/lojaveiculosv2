import type {
  CreateInventoryChecklistInput,
  CreateInventoryCostInput,
  CreateInventoryFlowInput,
  CreateInventoryFlowResult,
  CreateInventoryListingInput,
  CreateInventoryUnitInput,
  InventoryAuth,
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
import type { InventoryAcquisitionApi } from "./inventoryAcquisitionApi";
import type { InventoryCatalogApi } from "./inventoryCatalogApi";
import type { InventoryMediaApi } from "./inventoryMediaApi";
import type { ListInventoryInput } from "./apiRoutes";

export type InventoryApi = {
  attachUnit: (
    listingId: string,
    input: CreateInventoryUnitInput,
  ) => Promise<InventoryListingDetail>;
  addCost: (
    listingId: string,
    input: CreateInventoryCostInput,
  ) => Promise<InventoryListingDetail>;
  createChecklist: (
    listingId: string,
    unitId: string,
    input: CreateInventoryChecklistInput,
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
  listChecklists: (
    listingId: string,
    unitId: string,
  ) => Promise<readonly InventoryChecklist[]>;
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
  updateChecklist: (
    listingId: string,
    unitId: string,
    checklistId: string,
    input: UpdateInventoryChecklistInput,
  ) => Promise<InventoryListingDetail>;
  updateUnit: (
    listingId: string,
    unitId: string,
    input: UpdateInventoryUnitInput,
  ) => Promise<InventoryListingDetail>;
} & InventoryCatalogApi &
  InventoryAcquisitionApi &
  InventoryMediaApi;

export type CreateInventoryApiOptions = {
  auth?: InventoryAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};
