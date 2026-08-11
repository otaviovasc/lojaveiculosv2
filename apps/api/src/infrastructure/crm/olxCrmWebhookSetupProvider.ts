import type { OlxCrmWebhookSetupProvider } from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import { CrmConnectionSetupProviderError } from "../../domains/crm/ports/crmConnectionSetupProvider.js";

const OLX_AUTOSERVICE_ORIGIN = "https://apps.olx.com.br";

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
      redirect: "error",
    });
  } catch {
    throw new CrmConnectionSetupProviderError(
      "OLX webhook registration failed.",
      "request_failed",
    );
  }
  if (!response.ok) {
    throw new CrmConnectionSetupProviderError(
      "OLX rejected webhook registration.",
      response.status === 429
        ? "rate_limited"
        : response.status >= 500
          ? "request_failed"
          : "provider_rejected",
      response.status,
    );
  }
}
