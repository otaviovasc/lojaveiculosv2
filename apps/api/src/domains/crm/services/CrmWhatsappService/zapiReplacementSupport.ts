import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  assertEntitlement,
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { CrmConnectionNotFoundError } from "../../messaging/crmMessagingErrors.js";
import { toCrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
import { getZapiConnectionSetupProvider } from "../CrmService/crmConnectionSetupSupport.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { readConnectionLiveStatus } from "../../whatsapp/zapiConnectionCredentialUpdate.js";
import { sealZapiCredentials } from "../../whatsapp/zapiInitialCredentials.js";
import type {
  ReplacementState,
  StartZapiReplacementInput,
  ZapiReplacementResult,
} from "./replaceZapiConnection.js";

export class ZapiReplacementRevisionConflictError extends Error {
  constructor(
    readonly details: {
      connectionId: string;
      expectedRevision: number;
      actualRevision: number;
    },
  ) {
    super("The Z-API connection changed while replacement was being prepared.");
    this.name = "ZapiReplacementRevisionConflictError";
  }
}

export class ZapiReplacementNotFoundError extends Error {
  constructor() {
    super("The Z-API replacement operation is no longer available.");
    this.name = "ZapiReplacementNotFoundError";
  }
}

export function authorizeReplacement(context: ServiceContext) {
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "Z-API replacement requires an authenticated store user.",
    );
  }
  assertPermission(context, "crm.messaging.connection.setup");
  assertPermission(context, credentialRotationPermission);
  assertEntitlement(context as StoreScopedServiceContext, "crm");
}

export function assertCurrentConnection(
  connection: CrmConnection | null,
  connectionId: string,
  scope: { storeId: string; tenantId: string },
): asserts connection is CrmConnection {
  if (
    !connection ||
    connection.provider !== "zapi" ||
    connection.channel !== "whatsapp" ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new CrmConnectionNotFoundError(connectionId);
  }
}

export function readReplacementState(
  metadata: Record<string, unknown>,
): ReplacementState | null {
  const value = metadata.zapiReplacement;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = value as Partial<ReplacementState>;
  if (
    typeof state.operationId !== "string" ||
    typeof state.idempotencyKey !== "string" ||
    typeof state.expectedRevision !== "number" ||
    typeof state.candidateInstanceId !== "string" ||
    !["verifying", "verified", "failed", "completed"].includes(
      String(state.status),
    )
  ) {
    return null;
  }
  return state as ReplacementState;
}

export async function verifyCandidateCredentials(
  input: StartZapiReplacementInput,
  ports: CrmServicePorts,
) {
  return getZapiConnectionSetupProvider(ports).validateStatus({
    clientToken: input.clientToken,
    instanceId: input.instanceId.trim(),
    instanceToken: input.instanceToken,
  });
}

export async function sealCandidate(
  input: StartZapiReplacementInput,
  current: CrmConnection,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  return sealZapiCredentials(
    {
      channel: "whatsapp",
      clientToken: input.clientToken,
      displayName: current.displayName,
      instanceId: input.instanceId,
      instanceToken: input.instanceToken,
      provider: "zapi",
    },
    scope,
    ports,
    current.credentialsRef,
    { reuseWebhookSecret: false },
  );
}

const credentialRotationPermission = "crm.messaging.credentials.rotate";

export async function toReplacementResult(
  context: ServiceContext,
  connection: CrmConnection,
  state: ReplacementState,
  ports: CrmServicePorts,
): Promise<ZapiReplacementResult> {
  return {
    connection: toCrmChannelConnection(
      connection,
      await readConnectionLiveStatus(context, connection, ports),
    ),
    operationId: state.operationId,
    status: state.status,
  };
}
