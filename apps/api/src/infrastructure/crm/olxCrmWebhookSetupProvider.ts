import type { OlxCrmWebhookSetupProvider } from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import { CrmConnectionSetupProviderError } from "../../domains/crm/ports/crmConnectionSetupProvider.js";

const OLX_AUTOSERVICE_ORIGIN = "https://apps.olx.com.br";
const MAX_ATTEMPTS = 3;
const MAX_SYNCHRONOUS_RETRY_AFTER_SECONDS = 2;
const REQUEST_TIMEOUT_MS = 5_000;

export function createOlxCrmWebhookSetupProvider(
  fetchImpl: typeof fetch = fetch,
  wait: (milliseconds: number) => Promise<void> = delay,
): OlxCrmWebhookSetupProvider {
  return {
    configureChat: (input) =>
      post(fetchImpl, wait, "/autoservice/v1/chat", input.accessToken, {
        webhook: input.callbackUrl,
      }),
    configureLeads: (input) =>
      post(fetchImpl, wait, "/autoservice/v1/lead", input.accessToken, {
        token: input.token,
        url: input.callbackUrl,
      }),
  };
}

async function post(
  fetchImpl: typeof fetch,
  wait: (milliseconds: number) => Promise<void>,
  path: string,
  accessToken: string,
  body: Record<string, string>,
) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
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
      if (attempt < MAX_ATTEMPTS) {
        await wait(retryDelayMs(attempt));
        continue;
      }
      throw new CrmConnectionSetupProviderError(
        "OLX webhook registration failed.",
        "request_failed",
      );
    }
    if (response.ok) return;
    const retryAfterSeconds = readRetryAfterSeconds(response);
    if (
      isRetryableStatus(response.status) &&
      attempt < MAX_ATTEMPTS &&
      (retryAfterSeconds === undefined ||
        retryAfterSeconds <= MAX_SYNCHRONOUS_RETRY_AFTER_SECONDS)
    ) {
      await wait(
        retryAfterSeconds !== undefined
          ? retryAfterSeconds * 1_000
          : retryDelayMs(attempt),
      );
      continue;
    }
    throw new CrmConnectionSetupProviderError(
      "OLX rejected webhook registration.",
      response.status === 429
        ? "rate_limited"
        : response.status >= 500
          ? "request_failed"
          : "provider_rejected",
      response.status,
      retryAfterSeconds,
    );
  }
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

function retryDelayMs(attempt: number) {
  return attempt * 250;
}

function readRetryAfterSeconds(response: Response) {
  const header = response.headers.get("retry-after");
  if (header === null) return undefined;
  const value = Number(header);
  return Number.isFinite(value) && value >= 0 ? Math.min(value, 30) : undefined;
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
