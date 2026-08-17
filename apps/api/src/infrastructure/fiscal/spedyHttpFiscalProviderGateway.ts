import type { FiscalConnectionRepository } from "../../domains/fiscal/ports/fiscalConnectionRepository.js";
import type {
  FiscalProviderDocumentKind,
  FiscalProviderGateway,
  FiscalProviderStatus,
} from "../../domains/fiscal/ports/fiscalProviderGateway.js";
import {
  SpedyGatewayConfigurationError,
  SpedyGatewayHttpError,
} from "./spedyErrors.js";
import { readFiscalCompanyCredential } from "./fiscalCompanyCredential.js";
import { buildSpedyIssuePayload } from "./spedyFiscalPayload.js";
import { toIssueResult, toStatusResult } from "./spedyHttpFiscalResponse.js";

type Fetcher = typeof fetch;

type SpedyGatewayOptions = {
  connectionRepository: FiscalConnectionRepository;
  env: Record<string, string | undefined>;
  fetcher?: Fetcher;
};

const requiredRuntimeKeys = [
  "SPEDY_RUNTIME_IMPLEMENTATION",
  "SPEDY_API_URL",
  "SPEDY_OWNER_API_KEY",
  "FISCAL_CREDENTIAL_ENCRYPTION_KEY",
  "SPEDY_WEBHOOK_URL",
] as const;

export { SpedyGatewayConfigurationError, SpedyGatewayHttpError };

export function createSpedyHttpFiscalProviderGateway({
  connectionRepository,
  env,
  fetcher = fetch,
}: SpedyGatewayOptions): FiscalProviderGateway {
  return {
    async cancelDocument(input) {
      await requireReadyConnection(connectionRepository, env, input);
      const apiKey = await requireCompanyApiKey(connectionRepository, input);
      const payload = await request(
        fetcher,
        env,
        apiKey,
        "DELETE",
        documentPath(input.documentKind, input.providerDocumentId),
        { reason: input.reason },
      );
      return toStatusResult(payload, input.providerDocumentId);
    },
    async getProviderStatus(input) {
      return getSpedyProviderStatus(env, connectionRepository, input);
    },
    async issueDocument(input) {
      const connection = await requireReadyConnection(
        connectionRepository,
        env,
        input,
      );
      const apiKey = await requireCompanyApiKey(connectionRepository, input);
      return toIssueResult(
        await request(
          fetcher,
          env,
          apiKey,
          "POST",
          collectionPath(input.documentKind),
          buildSpedyIssuePayload(input, connection.taxDefaults),
        ),
      );
    },
    async syncDocumentStatus(input) {
      await requireConnected(connectionRepository, env, input);
      const apiKey = await requireCompanyApiKey(connectionRepository, input);
      const payload = await request(
        fetcher,
        env,
        apiKey,
        "GET",
        documentPath(input.documentKind, input.providerDocumentId),
      );
      return toStatusResult(payload, input.providerDocumentId);
    },
  };
}

async function requireConnected(
  repository: FiscalConnectionRepository,
  env: Record<string, string | undefined>,
  input: { storeId: string; tenantId: string },
) {
  const missing = [
    ...requiredRuntimeKeys
      .filter((key) => key !== "SPEDY_WEBHOOK_URL")
      .filter((key) => !env[key]),
    ...(env.SPEDY_RUNTIME_IMPLEMENTATION === "http"
      ? []
      : ["SPEDY_RUNTIME_IMPLEMENTATION=http"]),
  ];
  if (missing.length) throw new SpedyGatewayConfigurationError(missing);
  await requireCompanyApiKey(repository, input);
}

export async function getSpedyProviderStatus(
  env: Record<string, string | undefined>,
  connectionRepository: FiscalConnectionRepository,
  input: { storeId: string; tenantId: string },
): Promise<FiscalProviderStatus> {
  const connection = await connectionRepository.get(input);
  const credential = await readFiscalCompanyCredential(
    connectionRepository,
    input,
  );
  const missingConfiguration = [
    ...requiredRuntimeKeys.filter((key) => !env[key]),
    ...(env.SPEDY_RUNTIME_IMPLEMENTATION === "http"
      ? []
      : ["SPEDY_RUNTIME_IMPLEMENTATION=http"]),
    ...(connection?.companyId ? [] : ["fiscal.companyId"]),
    ...(credential.unreadable
      ? ["fiscal.companyApiKeyUnreadable"]
      : credential.value
        ? []
        : ["fiscal.companyApiKey"]),
    ...(connection?.defaultsStatus === "confirmed"
      ? []
      : ["fiscal.taxDefaultsConfirmation"]),
    ...(connection?.status === "ready" ? [] : ["fiscal.connectionReady"]),
  ];
  return {
    configured: missingConfiguration.length === 0,
    missingConfiguration,
    provider: "spedy",
    webhookConfigured: Boolean(
      env.SPEDY_WEBHOOK_URL && connection?.webhookRegisteredAt,
    ),
  };
}

async function requireReadyConnection(
  repository: FiscalConnectionRepository,
  env: Record<string, string | undefined>,
  input: { storeId: string; tenantId: string },
) {
  const status = await getSpedyProviderStatus(env, repository, input);
  if (!status.configured) {
    throw new SpedyGatewayConfigurationError(status.missingConfiguration);
  }
  const connection = await repository.get(input);
  if (!connection)
    throw new SpedyGatewayConfigurationError(["fiscal.connection"]);
  return connection;
}

async function requireCompanyApiKey(
  repository: FiscalConnectionRepository,
  input: { storeId: string; tenantId: string },
) {
  const credential = await readFiscalCompanyCredential(repository, input);
  if (!credential.value) {
    throw new SpedyGatewayConfigurationError([
      credential.unreadable
        ? "fiscal.companyApiKeyUnreadable"
        : "fiscal.companyApiKey",
    ]);
  }
  return credential.value;
}

async function request(
  fetcher: Fetcher,
  env: Record<string, string | undefined>,
  apiKey: string,
  method: "DELETE" | "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
) {
  const response = await fetcher(
    toUrl(requireEnv(env, "SPEDY_API_URL"), path),
    {
      ...(body ? { body: JSON.stringify(body) } : {}),
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        "X-Api-Key": apiKey,
      },
      method,
      signal: AbortSignal.timeout(30_000),
    },
  );
  const payload = await readPayload(response);
  if (!response.ok) {
    throw new SpedyGatewayHttpError(
      readErrorMessage(payload, response),
      response.status,
    );
  }
  return payload;
}

function collectionPath(kind: FiscalProviderDocumentKind) {
  return kind === "nfe" ? "product-invoices" : "service-invoices";
}

function documentPath(kind: FiscalProviderDocumentKind, id: string) {
  return `${collectionPath(kind)}/${encodeURIComponent(id)}`;
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

function readErrorMessage(
  payload: Record<string, unknown>,
  response: Response,
) {
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  const firstError =
    errors[0] && typeof errors[0] === "object"
      ? (errors[0] as Record<string, unknown>)
      : {};
  return typeof firstError.message === "string"
    ? firstError.message
    : typeof payload.message === "string"
      ? payload.message
      : `Spedy request failed with HTTP ${response.status}`;
}

function requireEnv(env: Record<string, string | undefined>, key: string) {
  const value = env[key];
  if (!value) throw new SpedyGatewayConfigurationError([key]);
  return value;
}

function toUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).href;
}
