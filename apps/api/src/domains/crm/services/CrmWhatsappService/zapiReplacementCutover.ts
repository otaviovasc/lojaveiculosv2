import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import {
  getCrmConnectionRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type {
  ReplacementState,
  ZapiReplacementResult,
} from "./replaceZapiConnection.js";
import {
  toReplacementResult,
  ZapiReplacementRevisionConflictError,
} from "./zapiReplacementSupport.js";

export async function cutoverVerifiedReplacement(
  context: ServiceContext,
  current: CrmConnection,
  state: ReplacementState,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
): Promise<ZapiReplacementResult> {
  if (!state.candidateCredentialsRef) {
    throw new Error("Replacement candidate is missing.");
  }
  const candidateCredentialsRef = state.candidateCredentialsRef;
  const repository = getCrmConnectionRepository(ports);
  const metadata = { ...current.metadata };
  delete metadata.zapiReplacement;
  metadata.connected = state.providerConnected === true;
  metadata.connectedPhone = state.providerPhone ?? null;
  metadata.degraded = false;
  metadata.errorCode = state.providerConnected ? null : "disconnected";
  metadata.routingStatus = "preserved";
  const updated = await runCrmTransaction(ports, async (transactionPorts) =>
    getCrmConnectionRepository(transactionPorts).updateConnection({
      connectionId: current.id,
      credentialsRef: candidateCredentialsRef,
      externalInstanceId: state.candidateInstanceId,
      ...(current.revision !== undefined
        ? { expectedRevision: current.revision }
        : {}),
      metadata,
      status: state.providerConnected ? "active" : "disconnected",
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    }),
  );
  if (!updated) {
    throw new ZapiReplacementRevisionConflictError({
      connectionId: current.id,
      expectedRevision: current.revision ?? 0,
      actualRevision:
        (await repository.findConnectionById(current.id))?.revision ?? 0,
    });
  }
  const completed: ReplacementState = {
    idempotencyKey: state.idempotencyKey,
    operationId: state.operationId,
    expectedRevision: state.expectedRevision,
    candidateInstanceId: state.candidateInstanceId,
    status: "completed",
    ...(state.providerConnected !== undefined
      ? { providerConnected: state.providerConnected }
      : {}),
    ...(state.providerPhone !== undefined
      ? { providerPhone: state.providerPhone }
      : {}),
    ...(state.errorCode !== undefined ? { errorCode: state.errorCode } : {}),
    startedAt: state.startedAt,
    updatedAt: new Date().toISOString(),
  };
  const completedConnection = await repository.updateConnection({
    connectionId: updated.id,
    metadata: { ...updated.metadata, zapiReplacement: completed },
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  return toReplacementResult(
    context,
    completedConnection ?? updated,
    completed,
    ports,
  );
}
