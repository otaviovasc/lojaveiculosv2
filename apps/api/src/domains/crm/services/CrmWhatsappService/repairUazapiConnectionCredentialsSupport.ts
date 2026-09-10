import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE } from "../../ports/crmConnectionSetupProvider.js";
import { getCrmConnectionCredentialVault } from "../CrmService/crmConnectionSetupSupport.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";

export class CrmUazapiCredentialVerificationError extends Error {
  constructor() {
    super("The supplied uazapi credentials could not be verified.");
    this.name = "CrmUazapiCredentialVerificationError";
  }
}

export class UazapiIdentityReplacementRequiresSupportError extends Error {
  constructor() {
    super("Replacing the uazapi instance identity requires support recovery.");
    this.name = "UazapiIdentityReplacementRequiresSupportError";
  }
}

export class UazapiConnectionRevisionConflictError extends Error {
  constructor(
    readonly details: { connectionId: string; expectedRevision: number },
  ) {
    super("The uazapi connection changed since the credentials were read.");
    this.name = "UazapiConnectionRevisionConflictError";
  }
}

export async function readCurrentUazapiInstanceId(
  connection: CrmConnection,
  ports: CrmServicePorts,
) {
  if (connection.externalInstanceId?.trim()) {
    return connection.externalInstanceId.trim();
  }
  const sealedInstanceId = readString(
    readRecord(connection.credentialsRef.stored).instanceId,
  );
  if (!sealedInstanceId) return null;
  return getCrmConnectionCredentialVault(ports).open({
    purpose: UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
    sealed: sealedInstanceId,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
