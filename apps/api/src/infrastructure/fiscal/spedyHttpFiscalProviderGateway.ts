import type {
  FiscalProviderGateway,
  FiscalProviderStatus,
} from "../../domains/fiscal/ports/fiscalProviderGateway.js";
import { toIssueResult, toStatusResult } from "./spedyHttpFiscalResponse.js";

type Fetcher = typeof fetch;

type SpedyGatewayOptions = {
  env: Record<string, string | undefined>;
  fetcher?: Fetcher;
};

const requiredSpedyKeys = [
  "SPEDY_RUNTIME_IMPLEMENTATION",
  "SPEDY_API_URL",
  "SPEDY_API_TOKEN",
] as const;

export class SpedyGatewayConfigurationError extends Error {
  constructor(missingConfiguration: readonly string[]) {
    super(
      `SPEDY fiscal gateway is not configured: ${missingConfiguration.join(", ")}`,
    );
    this.name = "SpedyGatewayConfigurationError";
  }
}

export class SpedyGatewayHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SpedyGatewayHttpError";
  }
}

export function createSpedyHttpFiscalProviderGateway({
  env,
  fetcher = fetch,
}: SpedyGatewayOptions): FiscalProviderGateway {
  const status = getSpedyProviderStatus(env);

  return {
    async cancelDocument(input) {
      assertConfigured(status);
      const path = requireEnv(env, "SPEDY_CANCEL_PATH").replace(
        "{providerDocumentId}",
        encodeURIComponent(input.providerDocumentId),
      );
      return toStatusResult(
        await request(fetcher, env, path, {
          providerDocumentId: input.providerDocumentId,
          reason: input.reason,
          storeId: input.storeId,
          tenantId: input.tenantId,
        }),
        input.providerDocumentId,
      );
    },
    async getProviderStatus() {
      return status;
    },
    async issueDocument(input) {
      assertConfigured(status);
      return toIssueResult(
        await request(fetcher, env, requireEnv(env, "SPEDY_ISSUE_PATH"), input),
      );
    },
    async syncDocumentStatus(input) {
      assertConfigured(status);
      const path = requireEnv(env, "SPEDY_STATUS_PATH").replace(
        "{providerDocumentId}",
        encodeURIComponent(input.providerDocumentId),
      );
      return toStatusResult(
        await request(fetcher, env, path, {
          providerDocumentId: input.providerDocumentId,
          storeId: input.storeId,
          tenantId: input.tenantId,
        }),
        input.providerDocumentId,
      );
    },
  };
}

export function getSpedyProviderStatus(
  env: Record<string, string | undefined>,
): FiscalProviderStatus {
  const missingConfiguration = [
    ...requiredSpedyKeys.filter((key) => !env[key]),
    ...(env.SPEDY_RUNTIME_IMPLEMENTATION &&
    env.SPEDY_RUNTIME_IMPLEMENTATION !== "http"
      ? ["SPEDY_RUNTIME_IMPLEMENTATION=http"]
      : []),
    ...(env.SPEDY_WEBHOOK_SECRET ? [] : ["SPEDY_WEBHOOK_SECRET"]),
    ...(env.SPEDY_ISSUE_PATH ? [] : ["SPEDY_ISSUE_PATH"]),
    ...(env.SPEDY_CANCEL_PATH ? [] : ["SPEDY_CANCEL_PATH"]),
    ...(env.SPEDY_STATUS_PATH ? [] : ["SPEDY_STATUS_PATH"]),
  ];

  return {
    configured: missingConfiguration.length === 0,
    missingConfiguration,
    provider: "spedy",
    webhookConfigured: Boolean(env.SPEDY_WEBHOOK_SECRET),
  };
}

async function request(
  fetcher: Fetcher,
  env: Record<string, string | undefined>,
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetcher(
    toUrl(requireEnv(env, "SPEDY_API_URL"), path),
    {
      body: JSON.stringify(body),
      headers: createHeaders(env),
      method: "POST",
    },
  );
  const payload = await readPayload(response);

  if (!response.ok) {
    throw new SpedyGatewayHttpError(
      typeof payload.message === "string"
        ? payload.message
        : `SPEDY request failed with HTTP ${response.status}`,
      response.status,
    );
  }

  return payload;
}

function createHeaders(env: Record<string, string | undefined>) {
  const headerName = env.SPEDY_AUTH_HEADER || "Authorization";
  const authScheme = env.SPEDY_AUTH_SCHEME ?? "Bearer";
  const token = requireEnv(env, "SPEDY_API_TOKEN");
  return {
    "Content-Type": "application/json",
    [headerName]: authScheme ? `${authScheme} ${token}` : token,
  };
}

async function readPayload(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};

  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return { message: text };
  }
}

function assertConfigured(status: FiscalProviderStatus) {
  if (!status.configured) {
    throw new SpedyGatewayConfigurationError(status.missingConfiguration);
  }
}

function requireEnv(env: Record<string, string | undefined>, key: string) {
  const value = env[key];
  if (!value) throw new SpedyGatewayConfigurationError([key]);
  return value;
}

function toUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).href;
}
