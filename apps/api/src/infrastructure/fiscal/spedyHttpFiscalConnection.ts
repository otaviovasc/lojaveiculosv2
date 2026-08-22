import type { FiscalConnectionRepository } from "../../domains/fiscal/ports/fiscalConnectionRepository.js";
import type { FiscalProviderStatus } from "../../domains/fiscal/ports/fiscalProviderGateway.js";
import { readFiscalCompanyCredential } from "./fiscalCompanyCredential.js";
import { SpedyGatewayConfigurationError } from "./spedyErrors.js";

const requiredRuntimeKeys = [
  "SPEDY_RUNTIME_IMPLEMENTATION",
  "SPEDY_API_URL",
  "SPEDY_OWNER_API_KEY",
  "FISCAL_CREDENTIAL_ENCRYPTION_KEY",
  "SPEDY_WEBHOOK_URL",
] as const;

type Scope = { storeId: string; tenantId: string };

export async function requireConnectedFiscalCompany(
  repository: FiscalConnectionRepository,
  env: Record<string, string | undefined>,
  input: Scope,
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
  await requireFiscalCompanyApiKey(repository, input);
}

export async function getSpedyProviderStatus(
  env: Record<string, string | undefined>,
  connectionRepository: FiscalConnectionRepository,
  input: Scope,
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

export async function requireReadyFiscalCompany(
  repository: FiscalConnectionRepository,
  env: Record<string, string | undefined>,
  input: Scope,
) {
  const status = await getSpedyProviderStatus(env, repository, input);
  if (!status.configured) {
    throw new SpedyGatewayConfigurationError(status.missingConfiguration);
  }
  const connection = await repository.get(input);
  if (!connection) {
    throw new SpedyGatewayConfigurationError(["fiscal.connection"]);
  }
  return connection;
}

export async function requireFiscalCompanyApiKey(
  repository: FiscalConnectionRepository,
  input: Scope,
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
