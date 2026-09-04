import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type {
  FinancingInquiry,
  FinancingInquiryListItem,
  FinancingProvider,
} from "../../ports/financingRepository.js";
import type { FinancingSimulationCandidate } from "../../ports/financingProviderGateway.js";
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
): Promise<FinancingInquiryListItem[]> {
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
  if (!inquiry) {
    await auditSimulationPoll(context, input.inquiryId, {
      found: false,
      refreshed: false,
      scope,
    });
    return null;
  }
  if (!inquiry.providerInquiryId && inquiry.status !== "indeterminate") {
    await auditSimulationPoll(context, input.inquiryId, {
      found: true,
      refreshed: false,
      scope,
    });
    return inquiry;
  }
  const connection = await getUsableProviderConnection(
    { provider, tenantId: scope.tenantId },
    ports,
  );
  if (!inquiry.providerInquiryId) {
    const candidates = await getFinancingGateway(
      ports,
    ).listSimulationCandidates({
      createdAfter: new Date(inquiry.createdAt.getTime() - 86_400_000),
      credereStoreId: inquiry.providerStoreId,
      token: connection.token!,
    });
    const matches = candidates.filter((candidate) =>
      matchesIndeterminateInquiry(inquiry, candidate),
    );
    if (matches.length !== 1) {
      await auditSimulationPoll(context, inquiry.id, {
        found: true,
        reconciliation: matches.length > 1 ? "ambiguous" : "not_found",
        refreshed: false,
        scope,
      });
      return inquiry;
    }
    const simulation = await getFinancingGateway(ports).getSimulation({
      credereStoreId: inquiry.providerStoreId,
      token: connection.token!,
      uuid: matches[0]!.uuid,
    });
    const reconciled = await completeFromProvider(inquiry, simulation, ports);
    await auditSimulationPoll(context, reconciled.id, {
      reconciliation: "matched",
      refreshed: true,
      scope,
      status: reconciled.status,
    });
    return reconciled;
  }
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
    reconciliation?: "ambiguous" | "matched" | "not_found";
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
      ...(metadata.reconciliation
        ? { reconciliation: metadata.reconciliation }
        : {}),
      ...(metadata.status ? { status: metadata.status } : {}),
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: metadata.scope.storeId,
    summary: "Polled Credere financing simulation",
    tenantId: metadata.scope.tenantId,
  });
}

export function matchesIndeterminateInquiry(
  inquiry: FinancingInquiry,
  candidate: FinancingSimulationCandidate,
) {
  const vehicle = toRecord(inquiry.metadata.vehicle);
  const createdAt = Date.parse(candidate.createdAt);
  const earliest = inquiry.createdAt.getTime() - 60_000;
  const latest = inquiry.createdAt.getTime() + 15 * 60_000;
  return (
    candidate.customerDocumentHash === inquiry.customerDocumentHash &&
    candidate.assetValueCents === Number(vehicle.assetValueCents) &&
    candidate.manufactureYear === Number(vehicle.manufactureYear) &&
    candidate.modelYear === Number(vehicle.modelYear) &&
    candidate.vehicleMolicarCode === String(vehicle.vehicleMolicarCode ?? "") &&
    Number.isFinite(createdAt) &&
    createdAt >= earliest &&
    createdAt <= latest
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
