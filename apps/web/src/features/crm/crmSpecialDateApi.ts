import { readApiJson } from "../../lib/apiErrors";
import { createCrmEndpoint } from "./apiClient";
import { createProductCrmHeaders } from "./productCrmApi";
import type { ProductCrmAuth } from "./productCrmTypes";
import {
  CRM_SPECIAL_DATE_TYPES,
  type CrmSpecialDateConfig,
  type CrmSpecialDateConfigsResponse,
  type CrmSpecialDateType,
  type UpdateCrmSpecialDateConfigInput,
} from "./crmSpecialDateTypes";

export type CrmSpecialDateApi = {
  getConfigs: (
    connectionId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<CrmSpecialDateConfigsResponse>;
  updateConfig: (
    connectionId: string,
    dateType: CrmSpecialDateType,
    input: UpdateCrmSpecialDateConfigInput,
  ) => Promise<{ config: CrmSpecialDateConfig }>;
};

export type CreateCrmSpecialDateApiOptions = {
  auth?: ProductCrmAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export const crmSpecialDateRoutes = {
  configs: (connectionId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(connectionId)}/special-dates`,
      baseUrl,
    ),
  config: (
    connectionId: string,
    dateType: CrmSpecialDateType,
    baseUrl?: string,
  ) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(connectionId)}/special-dates/${encodeURIComponent(dateType)}`,
      baseUrl,
    ),
} as const;

export function createCrmSpecialDateApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateCrmSpecialDateApiOptions): CrmSpecialDateApi {
  const headers = createProductCrmHeaders(auth);

  return {
    getConfigs: (connectionId, options) =>
      fetch(crmSpecialDateRoutes.configs(connectionId, baseUrl), {
        headers,
        method: "GET",
        ...(options?.signal ? { signal: options.signal } : {}),
      })
        .then((response) => readJson<unknown>(response))
        .then(parseCrmSpecialDateConfigsResponse),
    updateConfig: (connectionId, dateType, input) =>
      fetch(crmSpecialDateRoutes.config(connectionId, dateType, baseUrl), {
        body: JSON.stringify(input),
        headers,
        method: "PUT",
      })
        .then((response) => readJson<unknown>(response))
        .then(parseCrmSpecialDateConfigResponse),
  };
}

export function parseCrmSpecialDateConfigsResponse(
  payload: unknown,
): CrmSpecialDateConfigsResponse {
  const record = asRecord(payload);
  if (!Array.isArray(record.configs)) {
    throw new Error("Resposta inválida ao carregar datas especiais.");
  }

  const parsed = record.configs.map(parseCrmSpecialDateConfig);
  const configs = CRM_SPECIAL_DATE_TYPES.map((dateType) =>
    parsed.find((config) => config.dateType === dateType),
  );
  if (configs.some((config) => !config) || parsed.length !== configs.length) {
    throw new Error(
      "Resposta inválida: o servidor não informou todas as datas especiais.",
    );
  }

  return { configs: configs as CrmSpecialDateConfig[] };
}

export function parseCrmSpecialDateConfigResponse(payload: unknown): {
  config: CrmSpecialDateConfig;
} {
  const record = asRecord(payload);
  if (!record.config) {
    throw new Error("Resposta inválida ao salvar a data especial.");
  }
  return { config: parseCrmSpecialDateConfig(record.config) };
}

function parseCrmSpecialDateConfig(payload: unknown): CrmSpecialDateConfig {
  const record = asRecord(payload);
  const dateType = record.dateType;
  const connectionId = record.connectionId;
  const leadDays = record.leadDays;
  const sendTime = record.sendTime;

  if (
    (typeof connectionId !== "string" && typeof connectionId !== "number") ||
    !isCrmSpecialDateType(dateType) ||
    typeof record.enabled !== "boolean" ||
    typeof leadDays !== "number" ||
    !Number.isInteger(leadDays) ||
    leadDays < 0 ||
    leadDays > 30 ||
    typeof sendTime !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime) ||
    typeof record.messageTemplate !== "string"
  ) {
    throw new Error("Resposta inválida ao carregar datas especiais.");
  }

  return {
    connectionId: String(connectionId),
    dateType,
    enabled: record.enabled,
    ...(typeof record.id === "string" ? { id: record.id } : {}),
    leadDays,
    messageTemplate: record.messageTemplate,
    sendTime,
    ...(typeof record.createdAt === "string"
      ? { createdAt: record.createdAt }
      : {}),
    ...(typeof record.updatedAt === "string"
      ? { updatedAt: record.updatedAt }
      : {}),
  };
}

function isCrmSpecialDateType(value: unknown): value is CrmSpecialDateType {
  return (
    typeof value === "string" &&
    CRM_SPECIAL_DATE_TYPES.includes(value as CrmSpecialDateType)
  );
}

function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "CRM datas especiais" });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
