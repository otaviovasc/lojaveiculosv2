import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmConnection,
  CrmConnectionRepository,
} from "../../ports/crmConnectionRepository.js";
import type { ZapiSupportWebhookTarget } from "../CrmWhatsappService/manageZapiConnectionAsSupport.js";
import { runZapiWebhookSetupAttempt } from "../CrmWhatsappService/runZapiWebhookSetupAttempt.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";

type CredentialState = Pick<
  CrmConnection,
  "credentialsRef" | "externalInstanceId" | "metadata" | "phone" | "status"
>;

export class CrmZapiCredentialVerificationError extends Error {
  constructor() {
    super("The supplied Z-API credentials could not be verified.");
    this.name = "CrmZapiCredentialVerificationError";
  }
}

export function snapshotZapiCredentialState(
  current: CrmConnection,
): CredentialState {
  return {
    credentialsRef: structuredClone(current.credentialsRef),
    externalInstanceId: current.externalInstanceId,
    metadata: structuredClone(current.metadata),
    phone: current.phone,
    status: current.status,
  };
}

export async function verifyUpdatedZapiCredentials(
  context: ServiceContext,
  input: ZapiSupportWebhookTarget & { connectionId: string },
  prior: CredentialState,
  updatedRevision: number | undefined,
  repository: CrmConnectionRepository,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  try {
    const verification = await runZapiWebhookSetupAttempt(
      context,
      input,
      ports,
    );
    if (
      verification.setup.status !== "configured" ||
      verification.connectionStatus === "unverified"
    ) {
      throw new CrmZapiCredentialVerificationError();
    }
  } catch (error) {
    const restored = await repository.updateConnection({
      connectionId: input.connectionId,
      ...prior,
      ...(updatedRevision !== undefined
        ? { expectedRevision: updatedRevision }
        : {}),
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!restored) {
      throw new Error("Z-API credential repair rollback target disappeared.");
    }
    throw error instanceof CrmZapiCredentialVerificationError
      ? error
      : new CrmZapiCredentialVerificationError();
  }
}
