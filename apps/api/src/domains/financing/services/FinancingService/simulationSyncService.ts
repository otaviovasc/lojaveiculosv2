import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type {
  FinancingInquiry,
  FinancingProvider,
} from "../../ports/financingRepository.js";
import { completeFromProvider } from "../../support/simulationProviderHelpers.js";
import { getUsableProviderConnection } from "../../support/tokenConnectionSupport.js";
import { matchesIndeterminateInquiry } from "./simulationService.js";
import {
  persistableConditions,
  sharedDownPayment,
  uniqueBankCodes,
} from "./simulationSyncProjection.js";
import {
  financingSimulationReadPermission,
  getFinancingGateway,
  now,
  requireFinancingScope,
  type FinancingServicePorts,
} from "./serviceSupport.js";

const provider = "credere" satisfies FinancingProvider;
const syncWindowDays = 90;
const localLookupLimit = 500;

export type CredereSimulationSyncResult = {
  created: number;
  remoteCount: number;
  skipped: number;
  syncedAt: Date;
  updated: number;
};

export async function syncCredereSimulations(
  context: ServiceContext,
  _input: unknown,
  ports: FinancingServicePorts,
): Promise<CredereSimulationSyncResult> {
  assertPermission(context, financingSimulationReadPermission);
  const scope = requireFinancingScope(context);
  context.logger.info(
    "financing.simulations.sync.started",
    createServiceLogMetadata(context, {
      permission: financingSimulationReadPermission,
      provider,
    }),
  );
  const mapping = await ports.repository.findStoreMapping({
    provider,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!mapping) {
    const result = emptyResult(now(ports));
    await auditSimulationSync(context, scope, result, "unmapped");
    return result;
  }
  const connection = await getUsableProviderConnection(
    { provider, tenantId: scope.tenantId },
    ports,
  );
  const gateway = getFinancingGateway(ports);
  const token = connection.token!;
  const createdAfter = new Date(
    now(ports).getTime() - syncWindowDays * 86_400_000,
  );
  const candidates = await gateway.listSimulationCandidates({
    createdAfter,
    credereStoreId: mapping.providerStoreId,
    token,
  });
  const local = await ports.repository.listInquiries({
    ...scope,
    limit: localLookupLimit,
  });
  const byProviderId = new Map<string, FinancingInquiry>(
    local
      .filter((inquiry) => inquiry.providerInquiryId)
      .map((inquiry) => [inquiry.providerInquiryId!, inquiry]),
  );
  const indeterminate = local.filter(
    (inquiry) =>
      inquiry.status === "indeterminate" && !inquiry.providerInquiryId,
  );
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const candidate of candidates) {
    const existing = byProviderId.get(candidate.uuid);
    if (
      existing &&
      (existing.status === "completed" || existing.status === "failed")
    ) {
      skipped += 1;
      continue;
    }
    const simulation = await gateway.getSimulation({
      credereStoreId: mapping.providerStoreId,
      token,
      uuid: candidate.uuid,
    });
    if (!existing) {
      const matched = matchIndeterminate(indeterminate, candidate);
      if (matched) {
        const reconciled = await completeFromProvider(
          matched.inquiry,
          simulation,
          ports,
        );
        indeterminate.splice(matched.index, 1);
        byProviderId.set(candidate.uuid, reconciled);
        updated += 1;
        continue;
      }
    }
    const result = await ports.repository.upsertProviderInquiry({
      amountCents: candidate.assetValueCents,
      bankCodes: uniqueBankCodes(simulation.conditions),
      completedAt: simulation.status === "pending" ? null : now(ports),
      conditions: persistableConditions(simulation.conditions),
      createdAt: parseProviderDate(candidate.createdAt) ?? now(ports),
      customerDocumentHash: candidate.customerDocumentHash,
      customerDocumentLast4: null,
      downPaymentCents: sharedDownPayment(simulation.conditions),
      installments: null,
      metadata: {
        backfilledFromProvider: true,
        vehicle: {
          assetValueCents: candidate.assetValueCents,
          manufactureYear: candidate.manufactureYear,
          modelYear: candidate.modelYear,
          vehicleMolicarCode: candidate.vehicleMolicarCode,
        },
      },
      provider,
      providerInquiryId: candidate.uuid,
      providerRequestId: simulation.providerRequestId,
      providerStoreId: mapping.providerStoreId,
      reason: simulation.reason,
      status:
        simulation.status === "completed"
          ? "completed"
          : simulation.status === "failed"
            ? "failed"
            : "submitted",
      storeId: scope.storeId,
      storeMappingId: mapping.id,
      success: simulation.success,
      tenantId: scope.tenantId,
    });
    byProviderId.set(candidate.uuid, result.inquiry);
    if (result.created) created += 1;
    else updated += 1;
  }
  const result: CredereSimulationSyncResult = {
    created,
    remoteCount: candidates.length,
    skipped,
    syncedAt: now(ports),
    updated,
  };
  await auditSimulationSync(context, scope, result);
  return result;
}

function matchIndeterminate(
  indeterminate: FinancingInquiry[],
  candidate: Parameters<typeof matchesIndeterminateInquiry>[1],
) {
  const index = indeterminate.findIndex((inquiry) =>
    matchesIndeterminateInquiry(inquiry, candidate),
  );
  return index === -1 ? null : { index, inquiry: indeterminate[index]! };
}

function parseProviderDate(value: string): Date | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function emptyResult(syncedAt: Date): CredereSimulationSyncResult {
  return { created: 0, remoteCount: 0, skipped: 0, syncedAt, updated: 0 };
}

async function auditSimulationSync(
  context: ServiceContext,
  scope: { storeId: string; tenantId: string },
  result: CredereSimulationSyncResult,
  skippedReason?: "unmapped",
): Promise<void> {
  await context.audit.record({
    action: "financing.simulations.sync",
    actor: context.actor,
    category: "data_change",
    entityId: scope.storeId,
    entityType: "financing_inquiry",
    metadata: {
      created: result.created,
      permission: financingSimulationReadPermission,
      provider,
      remoteCount: result.remoteCount,
      skipped: result.skipped,
      ...(skippedReason ? { skippedReason } : {}),
      updated: result.updated,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Synchronized Credere financing simulations",
    tenantId: scope.tenantId,
  });
}
