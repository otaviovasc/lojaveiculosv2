import { readApiJson } from "../../lib/apiErrors";
import type {
  CreateProductCrmActivityInput,
  CreateLeadFinancialProductInput,
  CreateProductCrmLeadInput,
  CrmLeadSource,
  CrmLeadStatus,
  ProductCrmAuth,
  ProductCrmLead,
  ProductCrmLeadActivity,
  LeadFinancialProductResult,
  UpdateProductCrmLeadInput,
} from "./productCrmTypes";
import type {
  Pipeline,
  PipelineStage,
  PipelineStageDraft,
} from "./crmPipelineStorage";
import { createCrmEndpoint } from "./apiClient";

export type ProductCrmApi = {
  createActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<ProductCrmLeadActivity>;
  createLead: (input: CreateProductCrmLeadInput) => Promise<ProductCrmLead>;
  createFinancialProduct: (
    leadId: string,
    input: CreateLeadFinancialProductInput,
  ) => Promise<LeadFinancialProductResult>;
  createPipeline: (input: CreateProductCrmPipelineInput) => Promise<Pipeline>;
  deletePipeline: (pipelineId: string) => Promise<{ deleted: true }>;
  archiveLead?: (leadId: string) => Promise<ProductCrmLead>;
  getLead?: (leadId: string) => Promise<ProductCrmLead>;
  listActivities: (leadId: string) => Promise<ProductCrmLeadActivity[]>;
  listLeadBoard: (
    query: ProductCrmLeadBoardQuery,
  ) => Promise<ProductCrmLeadBoard>;
  listLeadPage: (query?: ProductCrmLeadQuery) => Promise<ProductCrmLeadPage>;
  listLeads: (query?: ProductCrmLeadQuery) => Promise<ProductCrmLead[]>;
  listPipelines: () => Promise<Pipeline[]>;
  moveLeadPipelineStage: (
    leadId: string,
    input: MoveProductCrmLeadStageInput,
  ) => Promise<ProductCrmLead>;
  restoreLead?: (leadId: string) => Promise<ProductCrmLead>;
  updatePipeline: (
    pipelineId: string,
    input: UpdateProductCrmPipelineInput,
  ) => Promise<Pipeline>;
  updateLead: (
    leadId: string,
    input: UpdateProductCrmLeadInput,
  ) => Promise<ProductCrmLead>;
};

export type CreateProductCrmPipelineInput = {
  description?: string;
  isDefault?: boolean;
  name: string;
  rotationActive?: boolean;
  stages?: Array<PipelineStage | PipelineStageDraft>;
};

export type UpdateProductCrmPipelineInput =
  Partial<CreateProductCrmPipelineInput>;

export type MoveProductCrmLeadStageInput = {
  pipelineStageId: string;
};

export type ProductCrmLeadQuery = {
  cursor?: string;
  listingId?: string;
  limit?: number;
  offset?: number;
  pipelineId?: string;
  pipelineStageId?: string;
  search?: string;
  source?: CrmLeadSource;
  status?: CrmLeadStatus;
};

export type ProductCrmLeadPage = {
  leads: ProductCrmLead[];
  nextCursor: string | null;
  total: number;
};

export type ProductCrmLeadBoardQuery = {
  pipelineId: string;
  search?: string;
  source?: CrmLeadSource;
  stageLimit?: number;
  status?: CrmLeadStatus;
};

export type ProductCrmLeadBoardStage = ProductCrmLeadPage & {
  pipelineStageId: string;
};

export type ProductCrmLeadBoard = {
  stages: ProductCrmLeadBoardStage[];
};

export type CreateProductCrmApiOptions = {
  auth?: ProductCrmAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

type JsonBody = object;

export function createProductCrmApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateProductCrmApiOptions): ProductCrmApi {
  const getJson = <T>(route: string) =>
    fetch(route, {
      headers: createProductCrmHeaders(auth),
      method: "GET",
    }).then(readJson<T>);
  const postJson = <T>(route: string, body: JsonBody) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createProductCrmHeaders(auth),
      method: "POST",
    }).then(readJson<T>);
  const patchJson = <T>(route: string, body: JsonBody) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createProductCrmHeaders(auth),
      method: "PATCH",
    }).then(readJson<T>);
  const listLeadPage = (query?: ProductCrmLeadQuery) =>
    getJson<ProductCrmLeadPage>(
      withQuery(productCrmRoutes.leads(baseUrl), [
        createProductCrmLeadQuery(query),
      ]),
    );
  const listLeadBoard = (query: ProductCrmLeadBoardQuery) =>
    getJson<ProductCrmLeadBoard>(
      withQuery(productCrmRoutes.leadBoard(baseUrl), [
        createProductCrmLeadBoardQuery(query),
      ]),
    );

  return {
    archiveLead: (leadId) =>
      postJson(productCrmRoutes.archiveLead(leadId, baseUrl), {}),
    createActivity: (leadId, input) =>
      postJson(productCrmRoutes.activities(leadId, baseUrl), input),
    createLead: (input) => postJson(productCrmRoutes.leads(baseUrl), input),
    createFinancialProduct: (leadId, input) =>
      postJson(productCrmRoutes.financialProducts(leadId, baseUrl), input),
    createPipeline: (input) =>
      postJson(productCrmRoutes.pipelines(baseUrl), input),
    deletePipeline: (pipelineId) =>
      fetch(productCrmRoutes.pipeline(pipelineId, baseUrl), {
        headers: createProductCrmHeaders(auth),
        method: "DELETE",
      }).then(readJson<{ deleted: true }>),
    getLead: (leadId) => getJson(productCrmRoutes.lead(leadId, baseUrl)),
    listActivities: (leadId) =>
      getJson<{ activities: ProductCrmLeadActivity[] }>(
        productCrmRoutes.activities(leadId, baseUrl),
      ).then((payload) => payload.activities),
    listLeadBoard,
    listLeadPage,
    listLeads: (query) => listLeadPage(query).then((payload) => payload.leads),
    listPipelines: () =>
      getJson<{ pipelines: Pipeline[] }>(
        productCrmRoutes.pipelines(baseUrl),
      ).then((payload) => payload.pipelines),
    moveLeadPipelineStage: (leadId, input) =>
      patchJson(productCrmRoutes.leadPipelineStage(leadId, baseUrl), input),
    restoreLead: (leadId) =>
      postJson(productCrmRoutes.restoreLead(leadId, baseUrl), {}),
    updatePipeline: (pipelineId, input) =>
      patchJson(productCrmRoutes.pipeline(pipelineId, baseUrl), input),
    updateLead: (leadId, input) =>
      patchJson(productCrmRoutes.lead(leadId, baseUrl), input),
  };
}

export function createProductCrmHeaders(auth: ProductCrmAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;

  return headers;
}

export const productCrmRoutes = {
  archiveLead: (leadId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/leads/${encodeURIComponent(leadId)}/archive`,
      baseUrl,
    ),
  activities: (leadId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/leads/${encodeURIComponent(leadId)}/activities`,
      baseUrl,
    ),
  financialProducts: (leadId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/leads/${encodeURIComponent(leadId)}/financial-products`,
      baseUrl,
    ),
  lead: (leadId: string, baseUrl?: string) =>
    createCrmEndpoint(`/crm/leads/${encodeURIComponent(leadId)}`, baseUrl),
  leadBoard: (baseUrl?: string) =>
    createCrmEndpoint("/crm/leads/board", baseUrl),
  leadPipelineStage: (leadId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/leads/${encodeURIComponent(leadId)}/pipeline-stage`,
      baseUrl,
    ),
  leads: (baseUrl?: string) => createCrmEndpoint("/crm/leads", baseUrl),
  pipeline: (pipelineId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/pipelines/${encodeURIComponent(pipelineId)}`,
      baseUrl,
    ),
  pipelines: (baseUrl?: string) => createCrmEndpoint("/crm/pipelines", baseUrl),
  restoreLead: (leadId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/leads/${encodeURIComponent(leadId)}/restore`,
      baseUrl,
    ),
} as const;

export function createProductCrmLeadBoardQuery(
  query: ProductCrmLeadBoardQuery,
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "pipelineId", query.pipelineId);
  addOptionalParam(params, "search", query.search);
  addOptionalParam(params, "source", query.source);
  addOptionalParam(params, "stageLimit", query.stageLimit);
  addOptionalParam(params, "status", query.status);
  return params;
}

export function createProductCrmLeadQuery(query: ProductCrmLeadQuery = {}) {
  const params = new URLSearchParams();
  addOptionalParam(params, "cursor", query.cursor);
  addOptionalParam(params, "listingId", query.listingId);
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);
  addOptionalParam(params, "pipelineId", query.pipelineId);
  addOptionalParam(params, "pipelineStageId", query.pipelineStageId);
  addOptionalParam(params, "search", query.search);
  addOptionalParam(params, "source", query.source);
  addOptionalParam(params, "status", query.status);

  return params;
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "CRM" });
}

function withQuery(route: string, params: URLSearchParams[]) {
  const query = params
    .map((param) => param.toString())
    .filter(Boolean)
    .join("&");

  return query ? `${route}?${query}` : route;
}

function addOptionalParam(
  params: URLSearchParams,
  key: string,
  value: boolean | number | string | undefined,
) {
  if (value !== undefined && value !== "") {
    params.set(key, String(value));
  }
}

function cleanJson(body: JsonBody) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}
