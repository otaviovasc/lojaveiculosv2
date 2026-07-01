import { readApiJson } from "../../lib/apiErrors";
import { createSalesHeaders, salesRoutes } from "./apiRoutes";
import type {
  SaleDraftInput,
  SaleRecord,
  SalesAuth,
  SalesListQuery,
} from "./types";

export type SalesApi = {
  cancel: (saleId: string, reason?: string | null) => Promise<SaleRecord>;
  close: (saleId: string, input: TransitionInput) => Promise<SaleRecord>;
  createDraft: (input: SaleDraftInput) => Promise<SaleRecord>;
  list: (query?: SalesListQuery) => Promise<readonly SaleRecord[]>;
  reserve: (saleId: string, input: TransitionInput) => Promise<SaleRecord>;
  updateDraft: (saleId: string, input: SaleDraftInput) => Promise<SaleRecord>;
};

export type TransitionInput = {
  overrideReason?: string | null;
  overrideRequiredFields?: boolean;
};

export type CreateSalesApiOptions = {
  auth?: SalesAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createSalesApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateSalesApiOptions): SalesApi {
  const postJson = <T>(route: string, body: unknown) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createSalesHeaders(auth),
      method: "POST",
    }).then(readSalesJson<T>);
  const patchJson = <T>(route: string, body: unknown) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createSalesHeaders(auth),
      method: "PATCH",
    }).then(readSalesJson<T>);

  return {
    cancel: (saleId, reason) =>
      postJson<SaleRecord>(salesRoutes.cancel(saleId, baseUrl), {
        overrideReason: reason ?? null,
      }),
    close: (saleId, input) =>
      postJson<SaleRecord>(salesRoutes.close(saleId, baseUrl), input),
    createDraft: (input) =>
      postJson<SaleRecord>(salesRoutes.drafts(baseUrl), input),
    list: (query = {}) =>
      fetch(salesRoutes.list(baseUrl, query), {
        headers: createSalesHeaders(auth),
      })
        .then(readSalesJson<{ sales: readonly SaleRecord[] }>)
        .then((payload) => payload.sales),
    reserve: (saleId, input) =>
      postJson<SaleRecord>(salesRoutes.reserve(saleId, baseUrl), input),
    updateDraft: (saleId, input) =>
      patchJson<SaleRecord>(salesRoutes.draft(saleId, baseUrl), input),
  };
}

async function readSalesJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Vendas" });
}

function cleanJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cleanJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, cleanJson(entry)]),
  );
}
