import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { CrmScopeError } from "../../crmScopeError.js";
import { CrmUazapiInstanceNotFoundError } from "../../channelConnections/connectionCreation.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmUazapiProvisioningProvider } from "../../ports/crmUazapiProvisioningProvider.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { auditCrmServiceEvent } from "../CrmMessagingService/serviceSupport.js";
import type { StartUazapiReplacementInput } from "./replaceUazapiConnection.js";
import { resolveUazapiCandidateBaseUrl } from "./uazapiReplacementSupport.js";

export type ResolvedUazapiReplacementCandidate = {
  adminToken?: string;
  apiBaseUrl: string;
  instanceId: string;
  instanceToken: string;
  /** Set only when this replacement created a brand-new provider instance. */
  provisionedInstance?: {
    adminToken: string;
    baseUrl: string;
    instanceId: string;
  };
};

const replacementProvisionPermission = "crm.messaging.credentials.rotate";

export async function resolveUazapiReplacementCandidate(
  context: ServiceContext,
  input: StartUazapiReplacementInput,
  current: CrmConnection,
  ports: CrmServicePorts,
): Promise<ResolvedUazapiReplacementCandidate> {
  if ("instanceToken" in input) {
    return {
      apiBaseUrl: await resolveUazapiCandidateBaseUrl(input, current, ports),
      instanceId: input.instanceId.trim(),
      instanceToken: input.instanceToken.trim(),
    };
  }
  const provisioning = ports.crmUazapiProvisioningProvider;
  if (!provisioning) {
    throw new CrmScopeError("crmUazapiProvisioningProvider");
  }
  const adminToken = input.adminToken.trim();
  const adminBaseUrl = await resolveUazapiCandidateBaseUrl(
    input,
    current,
    ports,
  );
  if ("createInstance" in input) {
    return createReplacementInstance(
      context,
      input,
      provisioning,
      adminToken,
      adminBaseUrl,
    );
  }
  return attachReplacementInstance(
    context,
    input,
    provisioning,
    adminToken,
    adminBaseUrl,
  );
}

type AdminAttachReplacementInput = Extract<
  StartUazapiReplacementInput,
  { adminToken: string; instanceId: string }
>;

type AdminCreateReplacementInput = Extract<
  StartUazapiReplacementInput,
  { createInstance: { name?: string | undefined } }
>;

async function attachReplacementInstance(
  context: ServiceContext,
  input: AdminAttachReplacementInput,
  provisioning: CrmUazapiProvisioningProvider,
  adminToken: string,
  adminBaseUrl: string,
): Promise<ResolvedUazapiReplacementCandidate> {
  const instanceId = input.instanceId.trim();
  const audit = {
    action: "crm.provider.uazapi.connection.replace.attach",
    category: "data_change",
    entityType: "crm_whatsapp_connection",
    metadata: { provider: "uazapi" },
    permission: replacementProvisionPermission,
    summary: "Resolved a replacement instance from the store uazapi account",
  } as const satisfies Parameters<typeof auditCrmServiceEvent>[1];
  let instances: readonly { id: string; token: string }[];
  try {
    instances = await provisioning.listInstances({
      adminToken,
      baseUrl: adminBaseUrl,
    });
  } catch (error) {
    await auditCrmServiceEvent(context, audit, "failed");
    throw error;
  }
  // The instance token is always taken from the server-side list response;
  // client-supplied tokens are never trusted.
  const instance = instances.find((candidate) => candidate.id === instanceId);
  if (!instance) {
    await auditCrmServiceEvent(context, audit, "failed");
    throw new CrmUazapiInstanceNotFoundError(instanceId);
  }
  await auditCrmServiceEvent(context, audit);
  return {
    adminToken,
    apiBaseUrl: adminBaseUrl,
    instanceId: instance.id,
    instanceToken: instance.token,
  };
}

async function createReplacementInstance(
  context: ServiceContext,
  input: AdminCreateReplacementInput,
  provisioning: CrmUazapiProvisioningProvider,
  adminToken: string,
  adminBaseUrl: string,
): Promise<ResolvedUazapiReplacementCandidate> {
  const instanceName =
    input.createInstance.name?.trim() ||
    `v2-replacement-${crypto.randomUUID().slice(0, 8)}`;
  const audit = {
    action: "crm.provider.uazapi.connection.replace.provision",
    category: "data_change",
    entityType: "crm_whatsapp_connection",
    metadata: { instanceName, provider: "uazapi" },
    permission: replacementProvisionPermission,
    summary: "Provisioned a replacement uazapi instance",
  } as const satisfies Parameters<typeof auditCrmServiceEvent>[1];
  try {
    const provisioned = await provisioning.createInstance({
      adminToken,
      baseUrl: adminBaseUrl,
      name: instanceName,
    });
    await auditCrmServiceEvent(context, audit);
    return {
      adminToken,
      apiBaseUrl: provisioned.baseUrl,
      instanceId: provisioned.instanceId,
      instanceToken: provisioned.instanceToken,
      provisionedInstance: {
        adminToken,
        baseUrl: provisioned.baseUrl,
        instanceId: provisioned.instanceId,
      },
    };
  } catch (error) {
    await auditCrmServiceEvent(context, audit, "failed");
    throw error;
  }
}

export async function discardResolvedReplacementCandidate(
  context: ServiceContext,
  candidate: ResolvedUazapiReplacementCandidate,
  ports: CrmServicePorts,
) {
  if (!candidate.provisionedInstance) return;
  await discardProvisionedReplacementInstance(
    context,
    candidate.provisionedInstance,
    ports,
  );
}

async function discardProvisionedReplacementInstance(
  context: ServiceContext,
  provisioned: NonNullable<
    ResolvedUazapiReplacementCandidate["provisionedInstance"]
  >,
  ports: CrmServicePorts,
) {
  const provisioning = ports.crmUazapiProvisioningProvider;
  if (!provisioning) return;
  try {
    await provisioning.deleteInstance({
      adminToken: provisioned.adminToken,
      baseUrl: provisioned.baseUrl,
      instanceId: provisioned.instanceId,
    });
  } catch (compensationError) {
    context.logger.error(
      "crm.provider.uazapi.connection.replace.compensation_failed",
      {
        errorName:
          compensationError instanceof Error
            ? compensationError.name
            : "UnknownError",
        requestId: context.requestId,
      },
    );
  }
}
