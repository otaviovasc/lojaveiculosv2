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
import {
  assertCurrentConnection,
  authorizeReplacement,
  readReplacementState,
  sealCandidate,
  toReplacementResult,
  verifyCandidateCredentials,
  ZapiReplacementNotFoundError,
  ZapiReplacementRevisionConflictError,
} from "./zapiReplacementSupport.js";
import { verifyCandidateWebhooks } from "./zapiReplacementWebhooks.js";
import { cutoverVerifiedReplacement } from "./zapiReplacementCutover.js";

export type ReplacementStatus =
  "verifying" | "verified" | "failed" | "completed";
export type ReplacementState = {
  idempotencyKey: string;
  operationId: string;
  expectedRevision: number;
  status: ReplacementStatus;
  candidateInstanceId: string;
  candidateCredentialsRef?: Record<string, unknown>;
  providerConnected?: boolean;
  providerPhone?: string | null;
  errorCode?: string | null;
  startedAt: string;
  updatedAt: string;
};

export type StartZapiReplacementInput = {
  clientToken: string;
  connectionId: string;
  expectedRevision: number;
  idempotencyKey: string;
  instanceId: string;
  instanceToken: string;
  basePath: string;
  canonicalApiOrigin: string;
};

export {
  ZapiReplacementNotFoundError,
  ZapiReplacementRevisionConflictError,
} from "./zapiReplacementSupport.js";

export type ZapiReplacementResult = {
  connection: CrmChannelConnection;
  operationId: string;
  status: ReplacementStatus;
};

export async function startZapiConnectionReplacement(
  context: ServiceContext,
  input: StartZapiReplacementInput,
  ports: CrmServicePorts,
): Promise<ZapiReplacementResult> {
  assertPermission(context, "crm.messaging.connection.setup");
  logCrmServiceEvent(context, "crm.provider.zapi.connection.replace.started", {
    connectionId: input.connectionId,
    provider: "zapi",
  });
  authorizeReplacement(context);
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConnectionRepository(ports);
  const current = await repository.findConnectionById(input.connectionId);
  assertCurrentConnection(current, input.connectionId, scope);
  const existing = readReplacementState(current.metadata);
  if (existing?.idempotencyKey === input.idempotencyKey) {
    if (existing.status === "verified") {
      return recordCrmServiceMutation(
        context,
        {
          action: "crm.provider.zapi.connection.replace.resume",
          category: "data_change",
          entityId: current.id,
          entityType: "crm_whatsapp_connection",
          metadata: { operationId: existing.operationId, provider: "zapi" },
          permission: credentialRotationPermission,
          summary: "Resumed a verified Z-API replacement",
        },
        () =>
          cutoverVerifiedReplacement(context, current, existing, scope, ports),
      );
    }
    return toReplacementResult(context, current, existing, ports);
  }
  if (
    existing &&
    existing.status !== "failed" &&
    existing.status !== "completed"
  ) {
    throw new ZapiReplacementRevisionConflictError({
      connectionId: current.id,
      expectedRevision: existing.expectedRevision,
      actualRevision: current.revision ?? 0,
    });
  }
  if ((current.revision ?? 0) !== input.expectedRevision) {
    throw new ZapiReplacementRevisionConflictError({
      connectionId: current.id,
      expectedRevision: input.expectedRevision,
      actualRevision: current.revision ?? 0,
    });
  }
  if (current.externalInstanceId?.trim() === input.instanceId.trim()) {
    throw new Error(
      "The supplied instance is already the current Z-API instance; use credential repair.",
    );
  }

  const operationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const candidate = await verifyCandidateCredentials(input, ports);
  const candidateCredentialsRef = await sealCandidate(
    input,
    current,
    scope,
    ports,
  );
  await verifyCandidateWebhooks(
    current,
    input,
    candidateCredentialsRef,
    operationId,
    ports,
  );
  const state: ReplacementState = {
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
    metadata: { ...current.metadata, zapiReplacement: state },
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!staged) {
    const latest = await repository.findConnectionById(current.id);
    throw new ZapiReplacementRevisionConflictError({
      connectionId: current.id,
      expectedRevision: input.expectedRevision,
      actualRevision: latest?.revision ?? input.expectedRevision + 1,
    });
  }

  const cutover = await recordCrmServiceMutation(
    context,
    {
      action: "crm.provider.zapi.connection.replace",
      category: "data_change",
      entityId: current.id,
      entityType: "crm_whatsapp_connection",
      metadata: { operationId, provider: "zapi" },
      permission: credentialRotationPermission,
      summary: "Replaced the verified Z-API instance for the store",
    },
    () => cutoverVerifiedReplacement(context, staged, state, scope, ports),
  );
  await auditCrmServiceEvent(context, {
    action: "crm.provider.zapi.connection.replaced",
    category: "data_change",
    entityId: current.id,
    entityType: "crm_whatsapp_connection",
    metadata: { operationId, provider: "zapi" },
    permission: credentialRotationPermission,
    summary: "Completed a verified Z-API instance replacement",
  });
  return cutover;
}

const credentialRotationPermission = "crm.messaging.credentials.rotate";

export async function getZapiConnectionReplacementStatus(
  context: ServiceContext,
  input: { connectionId: string; operationId: string },
  ports: CrmServicePorts,
): Promise<ZapiReplacementResult> {
  authorizeReplacement(context);
  const scope = requireCrmMessagingScope(context);
  const current = await getCrmConnectionRepository(ports).findConnectionById(
    input.connectionId,
  );
  assertCurrentConnection(current, input.connectionId, scope);
  const state = readReplacementState(current.metadata);
  if (!state || state.operationId !== input.operationId) {
    throw new ZapiReplacementNotFoundError();
  }
  return toReplacementResult(context, current, state, ports);
}
