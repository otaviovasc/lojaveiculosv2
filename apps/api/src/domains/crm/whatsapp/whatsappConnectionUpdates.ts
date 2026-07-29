import type {
  CrmConnection,
  CrmConnectionConfiguredStatus,
} from "../ports/crmConnectionRepository.js";
import { WhatsappMessageActionError } from "./whatsappSendErrors.js";

export type UpdateWhatsappConnectionInput = {
  catalogPhone?: string | null;
  connectedPhone?: string | null;
  connectionId: string;
  credentialsEnv?: {
    apiBaseUrl: string;
    clientToken: string;
    instanceId: string;
    instanceToken: string;
  };
  composioCredentials?: {
    apiKeyEnv: string;
    connectedAccountId: string;
    graphVersion?: string;
  };
  displayName?: string;
  externalConnectionId?: string | null;
  externalInstanceId?: string | null;
  instanceCredentials?: {
    instanceId: string;
    instanceToken: string;
  };
  phone?: string | null;
  purpose?: string | null;
  status?: CrmConnectionConfiguredStatus;
  webhookUrl?: string | null;
};

export function buildUpdatedConnectionMetadata(
  current: Record<string, unknown>,
  input: UpdateWhatsappConnectionInput,
) {
  const next = { ...current };
  let changed = false;
  for (const key of ["catalogPhone", "connectedPhone", "purpose"] as const) {
    if (input[key] !== undefined) {
      next[key] = input[key];
      changed = true;
    }
  }
  if (input.composioCredentials?.graphVersion) {
    next.graphVersion = input.composioCredentials.graphVersion;
    changed = true;
  }
  return changed ? next : null;
}

export function buildUpdatedConnectionCredentialsRef(
  input: UpdateWhatsappConnectionInput,
  current: CrmConnection,
) {
  if (input.composioCredentials) {
    return {
      composio: {
        connectedAccountId: input.composioCredentials.connectedAccountId,
      },
      env: { apiKey: input.composioCredentials.apiKeyEnv },
      mode: "composio",
    };
  }
  if (input.credentialsEnv) {
    return {
      env: {
        apiBaseUrl: input.credentialsEnv.apiBaseUrl,
        clientToken: input.credentialsEnv.clientToken,
        instanceId: input.credentialsEnv.instanceId,
        instanceToken: input.credentialsEnv.instanceToken,
      },
      mode: "env",
    };
  }
  if (!input.instanceCredentials) return null;
  return toStoredCredentialsRef(input.instanceCredentials, current);
}

export function assertCredentialUpdateMatchesProvider(
  connection: CrmConnection,
  input: UpdateWhatsappConnectionInput,
) {
  if (
    input.composioCredentials &&
    connection.provider !== "composio_whatsapp" &&
    connection.provider !== "composio_instagram"
  ) {
    throw new WhatsappMessageActionError(
      "Composio credentials can only be configured on official Meta connections.",
      400,
    );
  }
  if (
    (input.credentialsEnv || input.instanceCredentials) &&
    connection.provider !== "zapi"
  ) {
    throw new WhatsappMessageActionError(
      "Z-API credentials can only be configured on Z-API connections.",
      400,
    );
  }
}

function toStoredCredentialsRef(
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
      instanceId: input.instanceId,
      instanceToken: input.instanceToken,
    },
  };
}
