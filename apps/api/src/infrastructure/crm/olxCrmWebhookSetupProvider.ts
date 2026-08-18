import type { OlxCrmWebhookSetupProvider } from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import { CrmConnectionSetupProviderError } from "../../domains/crm/ports/crmConnectionSetupProvider.js";

const OLX_AUTOSERVICE_ORIGIN = "https://apps.olx.com.br";
const REQUEST_TIMEOUT_MS = 5_000;

export function createOlxCrmWebhookSetupProvider(
  fetchImpl: typeof fetch = fetch,
): OlxCrmWebhookSetupProvider {
  return {
    configureChat: (input) =>
      post(fetchImpl, "/autoservice/v1/chat", input.accessToken, {
        webhook: input.callbackUrl,
      }),
    configureLeads: (input) =>
      post(fetchImpl, "/autoservice/v1/lead", input.accessToken, {
        token: input.token,
        url: input.callbackUrl,
      }),
  };
}

async function post(
  fetchImpl: typeof fetch,
  path: string,
  accessToken: string,
  body: Record<string, string>,
) {
  let response: Response;
  try {
    response = await fetchImpl(`${OLX_AUTOSERVICE_ORIGIN}${path}`, {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new CrmConnectionSetupProviderError(
      "OLX webhook registration outcome is indeterminate. Reconcile it before retrying.",
      "provider_outcome_indeterminate",
      undefined,
      undefined,
      undefined,
      false,
    );
  }
  const providerRequestId = readProviderRequestId(response);
  if (response.ok) {
    return { httpStatus: response.status, providerRequestId };
  }
  const retryAfterSeconds = readRetryAfterSeconds(response);
  if (path === "/autoservice/v1/chat" && response.status === 500) {
    throw new CrmConnectionSetupProviderError(
      "OLX webhook registration is temporarily unavailable.",
      "request_failed",
      response.status,
      retryAfterSeconds,
      providerRequestId ?? undefined,
      true,
    );
  }
  const provesRejection = PROVEN_REJECTION_STATUSES.has(response.status);
  throw new CrmConnectionSetupProviderError(
    provesRejection
      ? "OLX rejected webhook registration."
      : "OLX webhook registration outcome is indeterminate. Reconcile it before retrying.",
    provesRejection ? "provider_rejected" : "provider_outcome_indeterminate",
    response.status,
    retryAfterSeconds,
    providerRequestId ?? undefined,
    false,
  );
}

// Timeout, conflict, too-early, and rate-limit responses stay indeterminate
// unless OLX documents that they cannot follow a processed registration.
const PROVEN_REJECTION_STATUSES = new Set([
  400, 401, 403, 404, 405, 406, 410, 411, 412, 413, 414, 415, 416, 417, 421,
  422, 426, 428, 431,
]);

const PROVIDER_REQUEST_ID_HEADERS = [
  "x-olx-request-id",
  "x-request-id",
  "x-correlation-id",
  "x-operation-id",
] as const;

function readProviderRequestId(response: Response) {
  for (const header of PROVIDER_REQUEST_ID_HEADERS) {
    const value = response.headers.get(header)?.trim();
    if (value && /^[a-zA-Z0-9._:/-]{1,160}$/.test(value)) return value;
  }
  return null;
}

function readRetryAfterSeconds(response: Response) {
  const header = response.headers.get("retry-after");
  if (header === null) return undefined;
  const value = Number(header);
  return Number.isFinite(value) && value >= 0 ? Math.min(value, 30) : undefined;
}
