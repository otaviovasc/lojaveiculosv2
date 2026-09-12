import type { FinancingTokenSet } from "../../domains/financing/ports/financingProviderGateway.js";
import {
  bearerHeaders,
  credereApiUrl,
  fetchCredere,
  fetchWithReadRetry,
  networkError,
  parseSafeJson,
  providerError,
} from "./credereHttpSupport.js";

type ReadInput = {
  credereStoreId?: string;
  token: FinancingTokenSet;
};

type WriteInput = {
  credereStoreId: string;
  token: FinancingTokenSet;
};

export async function readCredereJson(
  fetchImpl: typeof fetch,
  path: string,
  input: ReadInput,
  options: { query?: Record<string, string>; storeHeader?: boolean } = {},
  apiRoot?: string,
) {
  const response = await readCredere(fetchImpl, path, input, options, apiRoot);
  if (!response.ok) throw providerError(response);
  return parseSafeJson(response);
}

export function readCredere(
  fetchImpl: typeof fetch,
  path: string,
  input: ReadInput,
  options: { query?: Record<string, string>; storeHeader?: boolean } = {},
  apiRoot?: string,
) {
  return fetchWithReadRetry(
    fetchImpl,
    credereApiUrl(path, options.query, apiRoot),
    {
      headers: bearerHeaders(
        input.token.accessToken,
        options.storeHeader === false ? undefined : input.credereStoreId,
      ),
      method: "GET",
    },
  );
}

export async function writeCredereJson(
  fetchImpl: typeof fetch,
  path: string,
  input: WriteInput,
  options: { body: unknown; method: "POST" | "PUT" },
  apiRoot?: string,
) {
  const response = await writeCredereJsonResponse(
    fetchImpl,
    path,
    input,
    options,
    apiRoot,
  );
  return parseSafeJson(response);
}

export async function writeCredereJsonResponse(
  fetchImpl: typeof fetch,
  path: string,
  input: WriteInput,
  options: {
    body: unknown;
    indeterminateOnFailure?: boolean;
    method: "POST" | "PUT";
  },
  apiRoot?: string,
) {
  let response: Response;
  try {
    response = await fetchCredere(
      fetchImpl,
      credereApiUrl(path, undefined, apiRoot),
      {
        body: JSON.stringify(stripUndefined(options.body)),
        headers: bearerHeaders(input.token.accessToken, input.credereStoreId),
        method: options.method,
      },
    );
  } catch {
    throw networkError(options.indeterminateOnFailure === true);
  }
  if (!response.ok) {
    if (options.indeterminateOnFailure && response.status >= 500) {
      throw networkError(true);
    }
    throw providerError(response);
  }
  return response;
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefined(entry)]),
  );
}
