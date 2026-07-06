import { readApiJson } from "../../lib/apiErrors";
import type {
  CreateProductCrmActivityInput,
  CreateProductCrmLeadInput,
  CrmLeadSource,
  CrmLeadStatus,
  ProductCrmAuth,
  ProductCrmLead,
  ProductCrmLeadActivity,
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
  createPipeline: (input: CreateProductCrmPipelineInput) => Promise<Pipeline>;
  deletePipeline: (pipelineId: string) => Promise<{ deleted: true }>;
  listActivities: (leadId: string) => Promise<ProductCrmLeadActivity[]>;
  listLeads: (query?: ProductCrmLeadQuery) => Promise<ProductCrmLead[]>;
  listPipelines: () => Promise<Pipeline[]>;
  moveLeadPipelineStage: (
    leadId: string,
    input: MoveProductCrmLeadStageInput,
  ) => Promise<ProductCrmLead>;
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
  listingId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  source?: CrmLeadSource;
  status?: CrmLeadStatus;
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

  return {
    createActivity: (leadId, input) =>
      postJson(productCrmRoutes.activities(leadId, baseUrl), input),
    createLead: (input) => postJson(productCrmRoutes.leads(baseUrl), input),
    createPipeline: (input) =>
      postJson(productCrmRoutes.pipelines(baseUrl), input),
    deletePipeline: (pipelineId) =>
      fetch(productCrmRoutes.pipeline(pipelineId, baseUrl), {
        headers: createProductCrmHeaders(auth),
        method: "DELETE",
      }).then(readJson<{ deleted: true }>),
    listActivities: (leadId) =>
      getJson<{ activities: ProductCrmLeadActivity[] }>(
        productCrmRoutes.activities(leadId, baseUrl),
      ).then((payload) => payload.activities),
    listLeads: (query) =>
      getJson<{ leads: ProductCrmLead[] }>(
        withQuery(productCrmRoutes.leads(baseUrl), [
          createProductCrmLeadQuery(query),
        ]),
      ).then((payload) => payload.leads),
    listPipelines: () =>
      getJson<{ pipelines: Pipeline[] }>(
        productCrmRoutes.pipelines(baseUrl),
      ).then((payload) => payload.pipelines),
    moveLeadPipelineStage: (leadId, input) =>
      patchJson(productCrmRoutes.leadPipelineStage(leadId, baseUrl), input),
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
  activities: (leadId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/leads/${encodeURIComponent(leadId)}/activities`,
      baseUrl,
    ),
  lead: (leadId: string, baseUrl?: string) =>
    createCrmEndpoint(`/crm/leads/${encodeURIComponent(leadId)}`, baseUrl),
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
} as const;

export function createProductCrmLeadQuery(query: ProductCrmLeadQuery = {}) {
  const params = new URLSearchParams();
  addOptionalParam(params, "listingId", query.listingId);
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);
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
