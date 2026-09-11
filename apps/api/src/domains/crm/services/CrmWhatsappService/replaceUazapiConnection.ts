import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { CrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
import {
  getCrmConnectionRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import { readCurrentUazapiInstanceId } from "./repairUazapiConnectionCredentialsSupport.js";
import {
  assertCurrentUazapiConnection,
  authorizeUazapiReplacement,
  readUazapiReplacementState,
  resolveUazapiCandidateBaseUrl,
  sealUazapiCandidate,
  toUazapiReplacementResult,
  UazapiReplacementNotFoundError,
  UazapiReplacementRevisionConflictError,
  verifyUazapiCandidateCredentials,
} from "./uazapiReplacementSupport.js";
import { cutoverVerifiedUazapiReplacement } from "./uazapiReplacementCutover.js";

export type UazapiReplacementStatus =
  "verifying" | "verified" | "failed" | "completed";
export type UazapiReplacementState = {
  idempotencyKey: string;
  operationId: string;
  expectedRevision: number;
  status: UazapiReplacementStatus;
  candidateInstanceId: string;
  candidateCredentialsRef?: Record<string, unknown>;
  providerConnected?: boolean;
  providerPhone?: string | null;
  errorCode?: string | null;
  startedAt: string;
  updatedAt: string;
};

export type StartUazapiReplacementInput = {
  baseUrl?: string;
  connectionId: string;
  expectedRevision: number;
  idempotencyKey: string;
  instanceId: string;
  instanceToken: string;
};

export {
  UazapiReplacementNotFoundError,
  UazapiReplacementRevisionConflictError,
} from "./uazapiReplacementSupport.js";

export type UazapiReplacementResult = {
  connection: CrmChannelConnection;
  operationId: string;
  status: UazapiReplacementStatus;
};

export async function startUazapiConnectionReplacement(
  context: ServiceContext,
  input: StartUazapiReplacementInput,
  ports: CrmServicePorts,
): Promise<UazapiReplacementResult> {
  assertPermission(context, "crm.messaging.connection.setup");
  logCrmServiceEvent(
    context,
    "crm.provider.uazapi.connection.replace.started",
    {
      connectionId: input.connectionId,
      provider: "uazapi",
    },
  );
  authorizeUazapiReplacement(context);
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConnectionRepository(ports);
  const current = await repository.findConnectionById(input.connectionId);
  assertCurrentUazapiConnection(current, input.connectionId, scope);
  const existing = readUazapiReplacementState(current.metadata);
  if (existing?.idempotencyKey === input.idempotencyKey) {
    if (existing.status === "verified") {
      return recordCrmServiceMutation(
        context,
        {
          action: "crm.provider.uazapi.connection.replace.resume",
          category: "data_change",
          entityId: current.id,
          entityType: "crm_whatsapp_connection",
          metadata: { operationId: existing.operationId, provider: "uazapi" },
          permission: credentialRotationPermission,
          summary: "Resumed a verified uazapi replacement",
        },
        () =>
          cutoverVerifiedUazapiReplacement(
            context,
            current,
            existing,
            scope,
            ports,
          ),
      );
    }
    return toUazapiReplacementResult(context, current, existing, ports);
  }
  if (
    existing &&
    existing.status !== "failed" &&
    existing.status !== "completed"
  ) {
    throw new UazapiReplacementRevisionConflictError({
      connectionId: current.id,
      expectedRevision: existing.expectedRevision,
      actualRevision: current.revision ?? 0,
    });
  }
  if ((current.revision ?? 0) !== input.expectedRevision) {
    throw new UazapiReplacementRevisionConflictError({
      connectionId: current.id,
      expectedRevision: input.expectedRevision,
      actualRevision: current.revision ?? 0,
    });
  }
  const currentInstanceId = await readCurrentUazapiInstanceId(current, ports);
  if (currentInstanceId === input.instanceId.trim()) {
    throw new Error(
      "The supplied instance is already the current uazapi instance; use credential repair.",
    );
  }

  const operationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const apiBaseUrl = await resolveUazapiCandidateBaseUrl(input, current, ports);
  const candidate = await verifyUazapiCandidateCredentials(
    apiBaseUrl,
    input,
    ports,
  );
  const candidateCredentialsRef = await sealUazapiCandidate(
    apiBaseUrl,
    input,
    current,
    scope,
    ports,
  );
  const state: UazapiReplacementState = {
    candidateInstanceId: "redacted",
    candidateCredentialsRef,
    expectedRevision: input.expectedRevision,
    idempotencyKey: input.idempotencyKey,
    operationId,
    providerConnected: candidate.connected,
    providerPhone: candidate.connectedPhone,
    status: "verified",
    startedAt: now,
    updatedAt: now,
  };

  const staged = await repository.updateConnection({
    connectionId: current.id,
    expectedRevision: input.expectedRevision,
    metadata: { ...current.metadata, uazapiReplacement: state },
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!staged) {
    const latest = await repository.findConnectionById(current.id);
    throw new UazapiReplacementRevisionConflictError({
      connectionId: current.id,
      expectedRevision: input.expectedRevision,
      actualRevision: latest?.revision ?? input.expectedRevision + 1,
    });
  }

  const cutover = await recordCrmServiceMutation(
    context,
    {
      action: "crm.provider.uazapi.connection.replace",
      category: "data_change",
      entityId: current.id,
      entityType: "crm_whatsapp_connection",
      metadata: { operationId, provider: "uazapi" },
      permission: credentialRotationPermission,
      summary: "Replaced the verified uazapi instance for the store",
    },
    () =>
      cutoverVerifiedUazapiReplacement(context, staged, state, scope, ports),
  );
  await auditCrmServiceEvent(context, {
    action: "crm.provider.uazapi.connection.replaced",
    category: "data_change",
    entityId: current.id,
    entityType: "crm_whatsapp_connection",
    metadata: { operationId, provider: "uazapi" },
    permission: credentialRotationPermission,
    summary: "Completed a verified uazapi instance replacement",
  });
  return cutover;
}

const credentialRotationPermission = "crm.messaging.credentials.rotate";

export async function getUazapiConnectionReplacementStatus(
  context: ServiceContext,
  input: { connectionId: string; operationId: string },
  ports: CrmServicePorts,
): Promise<UazapiReplacementResult> {
  authorizeUazapiReplacement(context);
  const scope = requireCrmMessagingScope(context);
  const current = await getCrmConnectionRepository(ports).findConnectionById(
    input.connectionId,
  );
  assertCurrentUazapiConnection(current, input.connectionId, scope);
  const state = readUazapiReplacementState(current.metadata);
  if (!state || state.operationId !== input.operationId) {
    throw new UazapiReplacementNotFoundError();
  }
  return toUazapiReplacementResult(context, current, state, ports);
}
