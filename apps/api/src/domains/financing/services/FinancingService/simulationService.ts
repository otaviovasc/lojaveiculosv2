import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type {
  FinancingInquiry,
  FinancingProvider,
} from "../../ports/financingRepository.js";
import { completeFromProvider } from "../../support/simulationProviderHelpers.js";
import { getUsableProviderConnection } from "../../support/tokenConnectionSupport.js";
import {
  financingSimulationReadPermission,
  getFinancingGateway,
  requireFinancingScope,
  type FinancingServicePorts,
} from "./serviceSupport.js";

const provider = "credere" satisfies FinancingProvider;

export async function listCredereSimulations(
  context: ServiceContext,
  _input: unknown,
  ports: FinancingServicePorts,
): Promise<FinancingInquiry[]> {
  assertPermission(context, financingSimulationReadPermission);
  const scope = requireFinancingScope(context);
  context.logger.info(
    "financing.simulations.list.started",
    createServiceLogMetadata(context, {
      permission: financingSimulationReadPermission,
      provider,
    }),
  );
  const inquiries = await ports.repository.listInquiries(scope);
  await context.audit.record({
    action: "financing.simulations.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "financing_inquiry",
    metadata: {
      permission: financingSimulationReadPermission,
      provider,
      resultCount: inquiries.length,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Listed Credere financing simulations",
    tenantId: scope.tenantId,
  });
  return inquiries;
}

export async function getCredereSimulation(
  context: ServiceContext,
  input: { inquiryId: string },
  ports: FinancingServicePorts,
): Promise<FinancingInquiry | null> {
  assertPermission(context, financingSimulationReadPermission);
  const scope = requireFinancingScope(context);
  context.logger.info(
    "financing.simulation.read.started",
    createServiceLogMetadata(context, {
      permission: financingSimulationReadPermission,
      provider,
    }),
  );
  const inquiry = await ports.repository.findInquiryById({
    ...scope,
    inquiryId: input.inquiryId,
  });
  await context.audit.record({
    action: "financing.simulation.read",
    actor: context.actor,
    category: "data_access",
    entityId: input.inquiryId,
    entityType: "financing_inquiry",
    metadata: {
      found: Boolean(inquiry),
      permission: financingSimulationReadPermission,
      provider,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Read Credere financing simulation",
    tenantId: scope.tenantId,
  });
  return inquiry;
}

export async function pollCredereSimulation(
  context: ServiceContext,
  input: { inquiryId: string },
  ports: FinancingServicePorts,
): Promise<FinancingInquiry | null> {
  assertPermission(context, financingSimulationReadPermission);
  const scope = requireFinancingScope(context);
  context.logger.info(
    "financing.simulation.poll.started",
    createServiceLogMetadata(context, {
      permission: financingSimulationReadPermission,
      provider,
    }),
  );
  const inquiry = await ports.repository.findInquiryById({
    ...scope,
    inquiryId: input.inquiryId,
  });
  if (!inquiry?.providerInquiryId) {
    await auditSimulationPoll(context, input.inquiryId, {
      found: Boolean(inquiry),
      refreshed: false,
      scope,
    });
    return inquiry;
  }
  const connection = await getUsableProviderConnection(
    { provider, tenantId: scope.tenantId },
    ports,
  );
  const simulation = await getFinancingGateway(ports).getSimulation({
    credereStoreId: inquiry.providerStoreId,
    token: connection.token!,
    uuid: inquiry.providerInquiryId,
  });
  const refreshed = await completeFromProvider(inquiry, simulation, ports);
  await auditSimulationPoll(context, refreshed.id, {
    refreshed: true,
    scope,
    status: refreshed.status,
  });
  return refreshed;
}

async function auditSimulationPoll(
  context: ServiceContext,
  inquiryId: string,
  metadata: {
    found?: boolean;
    refreshed: boolean;
    scope: { storeId: string; tenantId: string };
    status?: FinancingInquiry["status"];
  },
): Promise<void> {
  await context.audit.record({
    action: "financing.simulation.poll",
    actor: context.actor,
    category: "data_access",
    entityId: inquiryId,
    entityType: "financing_inquiry",
    metadata: {
      ...(metadata.found === undefined ? {} : { found: metadata.found }),
      permission: financingSimulationReadPermission,
      provider,
      refreshed: metadata.refreshed,
      ...(metadata.status ? { status: metadata.status } : {}),
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: metadata.scope.storeId,
    summary: "Polled Credere financing simulation",
    tenantId: metadata.scope.tenantId,
  });
}
