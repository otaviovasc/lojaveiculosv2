import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import {
  getCrmConnectionRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type {
  UazapiReplacementResult,
  UazapiReplacementState,
} from "./replaceUazapiConnection.js";
import {
  toUazapiReplacementResult,
  UazapiReplacementRevisionConflictError,
} from "./uazapiReplacementSupport.js";

export async function cutoverVerifiedUazapiReplacement(
  context: ServiceContext,
  current: CrmConnection,
  state: UazapiReplacementState,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
): Promise<UazapiReplacementResult> {
  if (!state.candidateCredentialsRef) {
    throw new Error("Replacement candidate is missing.");
  }
  const candidateCredentialsRef = state.candidateCredentialsRef;
  const repository = getCrmConnectionRepository(ports);
  const metadata = { ...current.metadata };
  delete metadata.uazapiReplacement;
  metadata.connected = state.providerConnected === true;
  metadata.connectedPhone = state.providerPhone ?? null;
  metadata.degraded = false;
  metadata.errorCode = state.providerConnected ? null : "disconnected";
  metadata.routingStatus = "preserved";
  // Webhooks stay bound to the previous instance until the explicit
  // configure action runs against the new instance.
  metadata.uazapiWebhookSetup = { state: "pending" };
  const updated = await runCrmTransaction(ports, async (transactionPorts) =>
    getCrmConnectionRepository(transactionPorts).updateConnection({
      connectionId: current.id,
      credentialsRef: candidateCredentialsRef,
      externalInstanceId: null,
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
    throw new UazapiReplacementRevisionConflictError({
      connectionId: current.id,
      expectedRevision: current.revision ?? 0,
      actualRevision:
        (await repository.findConnectionById(current.id))?.revision ?? 0,
    });
  }
  const completed: UazapiReplacementState = {
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
    metadata: { ...updated.metadata, uazapiReplacement: completed },
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  return toUazapiReplacementResult(
    context,
    completedConnection ?? updated,
    completed,
    ports,
  );
}
