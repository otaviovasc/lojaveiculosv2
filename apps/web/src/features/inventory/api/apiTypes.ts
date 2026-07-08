import type {
  CreateInventoryChecklistInput,
  CreateInventoryCostInput,
  CreateInventoryFlowInput,
  CreateInventoryFlowResult,
  CreateInventoryListingInput,
  CreateInventoryUnitInput,
  InventoryAuth,
  InventoryAuditEvent,
  InventoryChecklist,
  InventoryListingDetail,
  InventoryListingList,
  ReleaseInventoryReservationInput,
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
import type { InventoryAiStudioApi } from "./inventoryAiStudioApi";
import type { InventoryCatalogApi } from "./inventoryCatalogApi";
import type { InventoryMediaApi } from "./inventoryMediaApi";
import type { ListInventoryInput } from "./apiRoutes";

export type InventoryApi = {
  attachUnit: (
    listingId: string,
    input: CreateInventoryUnitInput,
  ) => Promise<InventoryListingDetail>;
  addCost: (
    unitId: string,
    input: CreateInventoryCostInput,
  ) => Promise<InventoryListingDetail>;
  createChecklist: (
    unitId: string,
    input: CreateInventoryChecklistInput,
  ) => Promise<InventoryListingDetail>;
  createFlow: (
    input: CreateInventoryFlowInput,
  ) => Promise<CreateInventoryFlowResult>;
  createListing: (
    input: CreateInventoryListingInput,
  ) => Promise<InventoryListingDetail>;
  deleteListing: (listingId: string) => Promise<void>;
  getListing: (listingId: string) => Promise<InventoryListingDetail>;
  lookupPlate: (input: {
    plate: string;
  }) => Promise<InventoryPlateLookupResponse>;
  analyzeResale: (
    input: InventoryResaleAnalysisRequest,
  ) => Promise<InventoryResaleAnalysisResponse>;
  analyzeListingResale: (listingId: string) => Promise<InventoryListingDetail>;
  listListings: (input?: ListInventoryInput) => Promise<InventoryListingList>;
  listListingAuditEvents: (
    listingId: string,
  ) => Promise<readonly InventoryAuditEvent[]>;
  listChecklists: (unitId: string) => Promise<readonly InventoryChecklist[]>;
  releaseReservation: (
    unitId: string,
    input: ReleaseInventoryReservationInput,
  ) => Promise<InventoryListingDetail>;
  reserveUnit: (
    unitId: string,
    input: ReserveInventoryListingInput,
  ) => Promise<InventoryListingDetail>;
  sellUnit: (
    unitId: string,
    input: SellInventoryListingInput,
  ) => Promise<InventoryListingDetail>;
  updateListingDetails: (
    listingId: string,
    input: UpdateInventoryListingInput,
  ) => Promise<InventoryListingDetail>;
  updateChecklist: (
    unitId: string,
    checklistId: string,
    input: UpdateInventoryChecklistInput,
  ) => Promise<InventoryListingDetail>;
  updateUnit: (
    unitId: string,
    input: UpdateInventoryUnitInput,
  ) => Promise<InventoryListingDetail>;
} & InventoryCatalogApi &
  InventoryAiStudioApi &
  InventoryAcquisitionApi &
  InventoryMediaApi;

export type CreateInventoryApiOptions = {
  auth?: InventoryAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};
