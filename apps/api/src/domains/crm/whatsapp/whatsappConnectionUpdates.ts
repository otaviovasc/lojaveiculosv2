import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { WhatsappMessageActionError } from "./whatsappSendErrors.js";

export type UpdateWhatsappConnectionInput = {
  catalogPhone?: string | null;
  connectionId: string;
  displayName?: string;
  externalInstanceId?: string;
  instanceCredentials?: {
    instanceId: string;
    instanceToken: string;
    webhookSecret?: string;
  };
  purpose?: string | null;
  webhookSetupTarget?: {
    basePath: string;
    canonicalApiOrigin: string;
  };
};

export function buildUpdatedConnectionMetadata(
  current: Record<string, unknown>,
  input: UpdateWhatsappConnectionInput,
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
  input: UpdateWhatsappConnectionInput,
  current: CrmConnection,
) {
  if (!input.instanceCredentials) return null;
  return toStoredCredentialsRef(input.instanceCredentials, current);
}

export function assertCredentialUpdateMatchesProvider(
  connection: CrmConnection,
  input: UpdateWhatsappConnectionInput,
) {
  if (input.instanceCredentials && connection.provider !== "zapi") {
    throw new WhatsappMessageActionError(
      "Z-API credentials can only be configured on Z-API connections.",
      400,
    );
  }
  if (input.externalInstanceId && connection.provider !== "zapi") {
    throw new WhatsappMessageActionError(
      "A provider instance identity can only be set on Z-API connections.",
      400,
    );
  }
}

export function toStoredCredentialsRef(
  input: NonNullable<UpdateWhatsappConnectionInput["instanceCredentials"]>,
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
