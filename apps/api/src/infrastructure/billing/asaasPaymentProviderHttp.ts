import { getAsaasProviderStatus } from "./asaasPaymentProviderConfig.js";

export type AsaasClient = {
  request: (
    method: "GET" | "POST" | "PUT",
    path: string,
    options?: {
      body?: Record<string, unknown>;
      query?: Record<string, string>;
    },
  ) => Promise<Record<string, unknown>>;
};

export function createAsaasClient(
  env: Record<string, string | undefined>,
  fetcher: typeof fetch,
): AsaasClient {
  const status = getAsaasProviderStatus(env);
  if (!status.configured) {
    throw new AsaasGatewayError(
      "asaas_provider_not_configured",
      `Asaas provider is not configured: ${status.missingConfiguration.join(", ")}`,
      503,
    );
  }
  const baseUrl = requiredEnv(env, "ASAAS_API_URL").replace(/\/+$/, "");
  const apiKey = requiredEnv(env, "ASAAS_API_KEY");

  return {
    async request(method, path, options = {}) {
      const url = new URL(`${baseUrl}${path}`);
      for (const [key, value] of Object.entries(options.query ?? {})) {
        url.searchParams.set(key, value);
      }
      const response = await fetcher(url, {
        headers: {
          accept: "application/json",
          access_token: apiKey,
          ...(method === "GET" ? {} : { "content-type": "application/json" }),
        },
        method,
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new AsaasGatewayError(
          "asaas_request_failed",
          providerErrorMessage(payload, response.status),
          response.status,
        );
      }
      return payload;
    },
  };
}

export function requiredString(value: unknown, path: string): string {
  const result = readString(value);
  if (!result) {
    throw new AsaasGatewayError(
      "asaas_response_invalid",
      `Asaas response is missing ${path}.`,
      502,
    );
  }
  return result;
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function readRecordArray(
  value: unknown,
): readonly Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object" && !Array.isArray(item)),
      )
    : [];
}

function providerErrorMessage(
  payload: Record<string, unknown>,
  status: number,
): string {
  const errors = readRecordArray(payload.errors)
    .map((error) => readString(error.description) ?? readString(error.code))
    .filter(Boolean);
  if (errors.length) return `Asaas request failed: ${errors.join("; ")}`;
  return `Asaas request failed with HTTP ${status}.`;
}

async function parseResponse(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function requiredEnv(
  env: Record<string, string | undefined>,
  key: string,
): string {
  const value = env[key];
  if (!value) {
    throw new AsaasGatewayError(
      "asaas_provider_not_configured",
      `Asaas provider is not configured: ${key}`,
      503,
    );
  }
  return value;
}

export class AsaasGatewayError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "AsaasGatewayError";
    this.code = code;
    this.status = status;
  }
}
