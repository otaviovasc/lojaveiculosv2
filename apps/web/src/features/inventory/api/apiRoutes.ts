import type { InventoryAuth, InventoryUnitStatus } from "../model/types";
import type { InventoryCatalogVehicleType } from "../model/types";
import type { InventoryChecklistOverviewInput } from "../model/checklistOverviewTypes";

export type ListInventoryInput = {
  limit?: number;
  offset?: number;
  search?: string;
  status?: InventoryUnitStatus;
};

export type ListVehicleSuppliersInput = {
  limit?: number;
  search?: string;
};

type CatalogInput = {
  vehicleType?: InventoryCatalogVehicleType;
};

export const inventoryRoutes = {
  checklistOverview: (
    input: InventoryChecklistOverviewInput = {},
    baseUrl?: string,
  ) =>
    checklistOverviewEndpoint("/inventory/checklists/overview", input, baseUrl),
  checklistReport: (
    input: InventoryChecklistOverviewInput = {},
    baseUrl?: string,
  ) =>
    checklistOverviewEndpoint(
      "/inventory/checklists/report.pdf",
      input,
      baseUrl,
    ),
  catalogBrands: (input: CatalogInput = {}, baseUrl?: string) =>
    catalogEndpoint("/inventory/catalog/brands", input, baseUrl),
  catalogModels: (
    brandCode: string,
    input: CatalogInput = {},
    baseUrl?: string,
  ) =>
    catalogEndpoint(
      `/inventory/catalog/brands/${encodeURIComponent(brandCode)}/models`,
      input,
      baseUrl,
    ),
  catalogVersions: (
    brandCode: string,
    modelFamilyCode: string,
    input: CatalogInput = {},
    baseUrl?: string,
  ) =>
    catalogEndpoint(
      `/inventory/catalog/brands/${encodeURIComponent(
        brandCode,
      )}/models/${encodeURIComponent(modelFamilyCode)}/versions`,
      input,
      baseUrl,
    ),
  catalogSnapshot: (
    input: CatalogInput & {
      brandCode: string;
      modelCode: string;
      yearCode: string;
    },
    baseUrl?: string,
  ) => {
    const endpoint = createInventoryEndpoint(
      "/inventory/catalog/snapshot",
      baseUrl,
    );
    const params = catalogParams(input);
    params.set("brandCode", input.brandCode);
    params.set("modelCode", input.modelCode);
    params.set("yearCode", input.yearCode);
    return `${endpoint}?${params.toString()}`;
  },
  catalogYears: (
    brandCode: string,
    versionCode: string,
    input: CatalogInput = {},
    baseUrl?: string,
  ) =>
    catalogEndpoint(
      `/inventory/catalog/brands/${encodeURIComponent(
        brandCode,
      )}/versions/${encodeURIComponent(versionCode)}/years`,
      input,
      baseUrl,
    ),
  detail: (listingId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/listings/${encodeURIComponent(listingId)}`,
      baseUrl,
    ),
  listingAuditEvents: (listingId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/listings/${encodeURIComponent(listingId)}/audit-events`,
      baseUrl,
    ),
  listingResaleAnalysis: (listingId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/listings/${encodeURIComponent(listingId)}/resale-analysis`,
      baseUrl,
    ),
  documentDownload: (
    documentId: string,
    disposition: "attachment" | "inline",
    baseUrl?: string,
  ) =>
    createInventoryEndpoint(
      `/documents/${encodeURIComponent(documentId)}/download?disposition=${disposition}`,
      baseUrl,
    ),
  plateLookup: (baseUrl?: string) =>
    createInventoryEndpoint("/inventory/enrichment/plate", baseUrl),
  resaleAnalysis: (baseUrl?: string) =>
    createInventoryEndpoint("/inventory/enrichment/resale-analysis", baseUrl),
  costs: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/costs`,
      baseUrl,
    ),
  checklists: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/checklists`,
      baseUrl,
    ),
  checklistDetail: (unitId: string, checklistId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/checklists/${encodeURIComponent(
        checklistId,
      )}`,
      baseUrl,
    ),
  list: (input: ListInventoryInput, baseUrl?: string) => {
    const endpoint = createInventoryEndpoint("/inventory/units", baseUrl);
    const params = new URLSearchParams();
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    if (input.offset !== undefined) params.set("offset", String(input.offset));
    if (input.search) params.set("search", input.search);
    if (input.status) params.set("status", input.status);
    return params.size > 0 ? `${endpoint}?${params.toString()}` : endpoint;
  },
  listings: (baseUrl?: string) =>
    createInventoryEndpoint("/inventory/listings", baseUrl),
  suppliers: (input: ListVehicleSuppliersInput = {}, baseUrl?: string) => {
    const endpoint = createInventoryEndpoint("/inventory/suppliers", baseUrl);
    const params = new URLSearchParams();
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    if (input.search) params.set("search", input.search);
    return params.size > 0 ? `${endpoint}?${params.toString()}` : endpoint;
  },
  supplier: (supplierId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/suppliers/${encodeURIComponent(supplierId)}`,
      baseUrl,
    ),
  media: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/media`,
      baseUrl,
    ),
  mediaDetail: (unitId: string, mediaId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/media/${encodeURIComponent(mediaId)}`,
      baseUrl,
    ),
  mediaContent: (unitId: string, mediaId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/media/${encodeURIComponent(mediaId)}/content`,
      baseUrl,
    ),
  mediaReorder: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/media/reorder`,
      baseUrl,
    ),
  mediaUploads: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/media/uploads`,
      baseUrl,
    ),
  aiStudioGenerations: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/ai-studio/generations`,
      baseUrl,
    ),
  aiStudioApprovals: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/ai-studio/approvals`,
      baseUrl,
    ),
  reserve: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/reserve`,
      baseUrl,
    ),
  releaseReservation: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/reservation/release`,
      baseUrl,
    ),
  sell: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/sell`,
      baseUrl,
    ),
  unitDocumentUploads: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/documents/uploads`,
      baseUrl,
    ),
  unitDocuments: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/documents`,
      baseUrl,
    ),
  unit: (listingId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/listings/${encodeURIComponent(listingId)}/unit`,
      baseUrl,
    ),
  unitDetail: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}`,
      baseUrl,
    ),
  unitAcquisition: (unitId: string, baseUrl?: string) =>
    createInventoryEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/acquisition`,
      baseUrl,
    ),
} as const;

function checklistOverviewEndpoint(
  path: string,
  input: InventoryChecklistOverviewInput,
  baseUrl?: string,
) {
  const endpoint = createInventoryEndpoint(path, baseUrl);
  const params = new URLSearchParams();
  if (input.scope) params.set("scope", input.scope);
  if (input.search) params.set("search", input.search);
  if (input.status) params.set("status", input.status);
  if (input.unitId) params.set("unitId", input.unitId);
  return params.size > 0 ? `${endpoint}?${params.toString()}` : endpoint;
}

function catalogEndpoint(path: string, input: CatalogInput, baseUrl?: string) {
  const endpoint = createInventoryEndpoint(path, baseUrl);
  const params = catalogParams(input);
  return params.size > 0 ? `${endpoint}?${params.toString()}` : endpoint;
}

function catalogParams(input: CatalogInput) {
  const params = new URLSearchParams();
  if (input.vehicleType) params.set("vehicleType", input.vehicleType);
  return params;
}

export function createInventoryHeaders(auth: InventoryAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;

  return headers;
}

export function createInventoryEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}
