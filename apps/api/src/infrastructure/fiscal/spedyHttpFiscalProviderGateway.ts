import type { FiscalConnectionRepository } from "../../domains/fiscal/ports/fiscalConnectionRepository.js";
import type {
  FiscalArtifactFormat,
  FiscalProviderDocumentKind,
  FiscalProviderGateway,
} from "../../domains/fiscal/ports/fiscalProviderGateway.js";
import {
  SpedyGatewayConfigurationError,
  SpedyGatewayHttpError,
} from "./spedyErrors.js";
import { buildSpedyIssuePayload } from "./spedyFiscalPayload.js";
import { requestSpedyFiscalArtifact } from "./spedyHttpFiscalArtifacts.js";
import { trustedSpedyUrl } from "./spedyHttpSecurity.js";
import {
  getSpedyProviderStatus,
  requireConnectedFiscalCompany,
  requireFiscalCompanyApiKey,
  requireReadyFiscalCompany,
} from "./spedyHttpFiscalConnection.js";
import { toIssueResult, toStatusResult } from "./spedyHttpFiscalResponse.js";

type Fetcher = typeof fetch;

type SpedyGatewayOptions = {
  connectionRepository: FiscalConnectionRepository;
  env: Record<string, string | undefined>;
  fetcher?: Fetcher;
};

export { SpedyGatewayConfigurationError, SpedyGatewayHttpError };

export function createSpedyHttpFiscalProviderGateway({
  connectionRepository,
  env,
  fetcher = fetch,
}: SpedyGatewayOptions): FiscalProviderGateway {
  return {
    async cancelDocument(input) {
      await requireReadyFiscalCompany(connectionRepository, env, input);
      const apiKey = await requireFiscalCompanyApiKey(
        connectionRepository,
        input,
      );
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
    async downloadDocumentArtifact(input) {
      await requireConnectedFiscalCompany(connectionRepository, env, input);
      const apiKey = await requireFiscalCompanyApiKey(
        connectionRepository,
        input,
      );
      return requestSpedyFiscalArtifact({
        apiKey,
        baseUrl: requireEnv(env, "SPEDY_API_URL"),
        fetcher,
        format: input.format,
        path: documentArtifactPath(
          input.documentKind,
          input.providerDocumentId,
          input.format,
        ),
      });
    },
    async issueDocument(input) {
      const connection = await requireReadyFiscalCompany(
        connectionRepository,
        env,
        input,
      );
      const apiKey = await requireFiscalCompanyApiKey(
        connectionRepository,
        input,
      );
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
      await requireConnectedFiscalCompany(connectionRepository, env, input);
      const apiKey = await requireFiscalCompanyApiKey(
        connectionRepository,
        input,
      );
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

async function request(
  fetcher: Fetcher,
  env: Record<string, string | undefined>,
  apiKey: string,
  method: "DELETE" | "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
) {
  const url = trustedSpedyUrl(requireEnv(env, "SPEDY_API_URL"), path);
  let response: Response;
  try {
    response = await fetcher(url, {
      ...(body ? { body: JSON.stringify(body) } : {}),
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        "X-Api-Key": apiKey,
      },
      method,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new SpedyGatewayHttpError("Spedy fiscal request failed.", 503);
  }
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

function documentArtifactPath(
  kind: FiscalProviderDocumentKind,
  id: string,
  format: FiscalArtifactFormat,
) {
  return `${documentPath(kind, id)}/${format}`;
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
