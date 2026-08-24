import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { CrmMessageActionError } from "../messaging/crmMessagingErrors.js";

export type UpdateCrmChannelConnectionInput = {
  catalogPhone?: string | null;
  connectionId: string;
  expectedRevision?: number;
  displayName?: string;
  externalInstanceId?: string;
  instanceCredentials?: {
    instanceId: string;
    instanceToken: string;
    webhookSecret?: string;
  };
  purpose?: string | null;
  status?: "active" | "paused";
  webhookSetupTarget?: {
    basePath: string;
    canonicalApiOrigin: string;
  };
};

export function buildUpdatedConnectionMetadata(
  current: Record<string, unknown>,
  input: UpdateCrmChannelConnectionInput,
) {
  const next = { ...current };
  let changed = false;
  for (const key of ["catalogPhone", "purpose"] as const) {
    if (input[key] !== undefined) {
      next[key] = input[key];
      changed = true;
    }
  }
  return changed ? next : null;
}

export function buildUpdatedConnectionCredentialsRef(
  input: UpdateCrmChannelConnectionInput,
  current: CrmConnection,
) {
  if (!input.instanceCredentials) return null;
  return toStoredCredentialsRef(input.instanceCredentials, current);
}

export function assertCredentialUpdateMatchesProvider(
  connection: CrmConnection,
  input: UpdateCrmChannelConnectionInput,
) {
  if (input.instanceCredentials && connection.provider !== "zapi") {
    throw new CrmMessageActionError(
      "Z-API credentials can only be configured on Z-API connections.",
      400,
    );
  }
  if (input.externalInstanceId && connection.provider !== "zapi") {
    throw new CrmMessageActionError(
      "A provider instance identity can only be set on Z-API connections.",
      400,
    );
  }
}

export function toStoredCredentialsRef(
  input: NonNullable<UpdateCrmChannelConnectionInput["instanceCredentials"]>,
  current: CrmConnection,
) {
  const currentEnv =
    current.credentialsRef.env &&
    typeof current.credentialsRef.env === "object" &&
    !Array.isArray(current.credentialsRef.env)
      ? (current.credentialsRef.env as Record<string, unknown>)
      : {};
  return {
    env: {
      ...(typeof currentEnv.apiBaseUrl === "string"
        ? { apiBaseUrl: currentEnv.apiBaseUrl }
        : {}),
      ...(typeof currentEnv.clientToken === "string"
        ? { clientToken: currentEnv.clientToken }
        : {}),
    },
    mode: "stored",
    stored: {
      ...readStoredCredentials(current.credentialsRef),
      instanceId: input.instanceId,
      instanceToken: input.instanceToken,
      ...(input.webhookSecret ? { webhookSecret: input.webhookSecret } : {}),
    },
  };
}

function readStoredCredentials(credentialsRef: Record<string, unknown>) {
  return credentialsRef.stored &&
    typeof credentialsRef.stored === "object" &&
    !Array.isArray(credentialsRef.stored)
    ? (credentialsRef.stored as Record<string, unknown>)
    : {};
}
