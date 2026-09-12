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
import {
  CrmConnectionSetupProviderError,
  UAZAPI_ADMIN_TOKEN_CREDENTIAL_PURPOSE,
  UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
} from "../../ports/crmConnectionSetupProvider.js";
import {
  getCrmConnectionCredentialVault,
  getUazapiConnectionSetupProvider,
} from "../CrmService/crmConnectionSetupSupport.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { readConnectionLiveStatus } from "../../whatsapp/zapiConnectionCredentialUpdate.js";
import type {
  StartUazapiReplacementInput,
  UazapiReplacementResult,
  UazapiReplacementState,
} from "./replaceUazapiConnection.js";
import type { ResolvedUazapiReplacementCandidate } from "./uazapiReplacementCandidate.js";
import {
  readRecord,
  readString,
} from "./repairUazapiConnectionCredentialsSupport.js";

export class UazapiReplacementRevisionConflictError extends Error {
  constructor(
    readonly details: {
      connectionId: string;
      expectedRevision: number;
      actualRevision: number;
    },
  ) {
    super(
      "The uazapi connection changed while replacement was being prepared.",
    );
    this.name = "UazapiReplacementRevisionConflictError";
  }
}

export class UazapiReplacementNotFoundError extends Error {
  constructor() {
    super("The uazapi replacement operation is no longer available.");
    this.name = "UazapiReplacementNotFoundError";
  }
}

export function authorizeUazapiReplacement(context: ServiceContext) {
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "Uazapi replacement requires an authenticated store user.",
    );
  }
  assertPermission(context, "crm.messaging.connection.setup");
  assertPermission(context, credentialRotationPermission);
  assertEntitlement(context as StoreScopedServiceContext, "crm");
}

export function assertCurrentUazapiConnection(
  connection: CrmConnection | null,
  connectionId: string,
  scope: { storeId: string; tenantId: string },
): asserts connection is CrmConnection {
  if (
    !connection ||
    connection.provider !== "uazapi" ||
    connection.channel !== "whatsapp" ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new CrmConnectionNotFoundError(connectionId);
  }
}

export function readUazapiReplacementState(
  metadata: Record<string, unknown>,
): UazapiReplacementState | null {
  const value = metadata.uazapiReplacement;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = value as Partial<UazapiReplacementState>;
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
  return state as UazapiReplacementState;
}

export async function resolveUazapiCandidateBaseUrl(
  input: Pick<StartUazapiReplacementInput, "baseUrl">,
  current: CrmConnection,
  ports: CrmServicePorts,
) {
  const fromInput = input.baseUrl?.trim();
  if (fromInput) return fromInput;
  const sealedBaseUrl = readString(
    readRecord(current.credentialsRef.stored).baseUrl,
  );
  if (sealedBaseUrl) {
    return getCrmConnectionCredentialVault(ports).open({
      purpose: UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
      sealed: sealedBaseUrl,
      storeId: current.storeId,
      tenantId: current.tenantId,
    });
  }
  throw new CrmConnectionSetupProviderError(
    "Uazapi base URL is missing. Inform the uazapi base URL to replace the instance.",
    "configuration_error",
  );
}

export async function verifyUazapiCandidateCredentials(
  candidate: ResolvedUazapiReplacementCandidate,
  ports: CrmServicePorts,
) {
  return getUazapiConnectionSetupProvider(ports).validateStatus({
    apiBaseUrl: candidate.apiBaseUrl,
    instanceId: candidate.instanceId,
    instanceToken: candidate.instanceToken,
  });
}

export async function sealUazapiCandidate(
  candidate: ResolvedUazapiReplacementCandidate,
  current: CrmConnection,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  const vault = getCrmConnectionCredentialVault(ports);
  const credentialScope = {
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
  const [adminToken, baseUrl, instanceId, instanceToken] = await Promise.all([
    candidate.adminToken
      ? vault.seal({
          ...credentialScope,
          plaintext: candidate.adminToken,
          purpose: UAZAPI_ADMIN_TOKEN_CREDENTIAL_PURPOSE,
        })
      : undefined,
    vault.seal({
      ...credentialScope,
      plaintext: candidate.apiBaseUrl,
      purpose: UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
    }),
    vault.seal({
      ...credentialScope,
      plaintext: candidate.instanceId,
      purpose: UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
    }),
    vault.seal({
      ...credentialScope,
      plaintext: candidate.instanceToken,
      purpose: UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
    }),
  ]);
  return {
    ...(current.credentialsRef.env ? { env: current.credentialsRef.env } : {}),
    mode: "stored",
    stored: {
      ...readRecord(current.credentialsRef.stored),
      ...(adminToken ? { adminToken } : {}),
      baseUrl,
      instanceId,
      instanceToken,
    },
  };
}

const credentialRotationPermission = "crm.messaging.credentials.rotate";

export async function toUazapiReplacementResult(
  context: ServiceContext,
  connection: CrmConnection,
  state: UazapiReplacementState,
  ports: CrmServicePorts,
): Promise<UazapiReplacementResult> {
  return {
    connection: toCrmChannelConnection(
      connection,
      await readConnectionLiveStatus(context, connection, ports),
    ),
    operationId: state.operationId,
    status: state.status,
  };
}
