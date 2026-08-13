import { CrmConnectionSetupProviderError } from "../../domains/crm/ports/crmConnectionSetupProvider.js";

export type ComposioSetupClient = {
  request: (
    path: string,
    init?: RequestInit,
  ) => Promise<Record<string, unknown>>;
};

export function createComposioSetupClient(
  baseUrl: string,
  apiKey: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): ComposioSetupClient {
  return {
    async request(path, init = {}) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${baseUrl}${path}`, {
          ...init,
          redirect: "error",
          headers: {
            Accept: "application/json",
            "x-api-key": apiKey,
            ...init.headers,
          },
          signal: controller.signal,
        });
        const payload = parseRecord(await response.text());
        if (!response.ok) {
          throw new CrmConnectionSetupProviderError(
            `Composio setup request was rejected with HTTP ${response.status}`,
            response.status === 429 ? "rate_limited" : "provider_rejected",
            response.status,
            response.status === 429
              ? readRetryAfter(response.headers)
              : undefined,
          );
        }
        if (!payload) {
          throw new CrmConnectionSetupProviderError(
            "Composio setup returned an invalid response",
            "invalid_provider_response",
          );
        }
        return payload;
      } catch (error) {
        if (error instanceof CrmConnectionSetupProviderError) throw error;
        if (controller.signal.aborted) {
          throw new CrmConnectionSetupProviderError(
            "Composio setup request timed out",
            "timeout",
          );
        }
        throw new CrmConnectionSetupProviderError(
          "Composio setup request failed before receiving a response",
          "request_failed",
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export async function executeComposioSetupTool(
  client: ComposioSetupClient,
  connectedAccountId: string,
  tool: string,
  args: Record<string, unknown>,
  version: string,
) {
  const payload = await client.request(
    `/api/v3.1/tools/execute/${encodeURIComponent(tool)}`,
    {
      body: JSON.stringify({
        arguments: args,
        connected_account_id: connectedAccountId,
        version,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  if (payload.successful === false) {
    throw new CrmConnectionSetupProviderError(
      `Composio WhatsApp tool ${tool} did not complete successfully`,
      "provider_rejected",
    );
  }
  if (
    payload.successful !== true ||
    !Object.prototype.hasOwnProperty.call(payload, "data")
  ) {
    throw new CrmConnectionSetupProviderError(
      `Composio WhatsApp tool ${tool} returned an invalid response`,
      "invalid_provider_response",
    );
  }
  return payload.data;
}

function parseRecord(text: string) {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readRetryAfter(headers: Headers) {
  const value = Number(headers.get("retry-after"));
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 1;
}
