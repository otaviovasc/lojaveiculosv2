import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { FinancingProvider } from "../../ports/financingRepository.js";
import type { FinancingIntegratedBank } from "../../ports/financingProviderGateway.js";
import type { FinancingReadiness } from "./types.js";
import {
  financingSimulationReadPermission,
  getFinancingGateway,
  normalizeBankCode,
  requireFinancingScope,
  type FinancingServicePorts,
} from "./serviceSupport.js";
import { getUsableProviderConnection } from "../../support/tokenConnectionSupport.js";

const provider = "credere" satisfies FinancingProvider;

export async function getFinancingReadiness(
  context: ServiceContext,
  ports: FinancingServicePorts,
): Promise<FinancingReadiness> {
  assertPermission(context, financingSimulationReadPermission);
  const scope = requireFinancingScope(context);
  context.logger.info(
    "financing.readiness.read.started",
    createServiceLogMetadata(context, {
      permission: financingSimulationReadPermission,
      provider,
    }),
  );
  const connection = await ports.repository.findConnection({
    provider,
    tenantId: scope.tenantId,
  });
  const mapping = await ports.repository.findStoreMapping({
    provider,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  let usableBanks: { code: string; name: string | null }[] = [];
  let unavailableBanks: FinancingReadiness["unavailableBanks"] = [];
  if (connection?.status === "connected" && mapping) {
    const usableConnection = await getUsableProviderConnection(
      { provider, tenantId: scope.tenantId },
      ports,
    );
    const [integratedBanks, policy, credentials] = await Promise.all([
      getFinancingGateway(ports).listIntegratedBanks({
        credereStoreId: mapping.providerStoreId,
        token: usableConnection.token!,
      }),
      ports.repository.readStoreBankPolicy({
        provider,
        providerStoreId: mapping.providerStoreId,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      }),
      ports.repository.listActiveOkayBankCredentials({
        provider,
        providerStoreId: mapping.providerStoreId,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      }),
    ]);
    const policySet = policy ? new Set(policy.map(normalizeBankCode)) : null;
    const credentialSet = credentials.length
      ? new Set(credentials.map((bank) => normalizeBankCode(bank.code)))
      : null;
    const eligibleBanks = integratedBanks.filter(
      (bank) => !policySet || policySet.has(normalizeBankCode(bank.code)),
    );
    usableBanks = eligibleBanks
      .filter((bank) => bank.active && bank.status === "okay")
      .map((bank) => ({
        code: normalizeBankCode(bank.code),
        name: bank.tradename ?? bank.name,
      }))
      .filter((bank) => !credentialSet || credentialSet.has(bank.code));
    unavailableBanks = eligibleBanks
      .filter(
        (bank) =>
          !bank.active ||
          bank.status !== "okay" ||
          Boolean(
            credentialSet && !credentialSet.has(normalizeBankCode(bank.code)),
          ),
      )
      .map((bank) => ({
        code: normalizeBankCode(bank.code),
        name: bank.tradename ?? bank.name,
        reason: unavailableBankReason(bank),
      }));
  }

  const readiness: FinancingReadiness = {
    canCreateSimulation:
      connection?.status === "connected" &&
      Boolean(mapping) &&
      usableBanks.length > 0,
    configured: connection?.status === "connected",
    connected: connection?.status === "connected",
    mapped: Boolean(mapping),
    mappedStoreAlias: mapping?.providerStoreName ?? null,
    provider,
    requiredFields: [],
    usableBankCount: usableBanks.length,
    usableBanks: usableBanks.map((bank) => ({
      code: bank.code,
      name: bank.name,
    })),
    unavailableBankCount: unavailableBanks.length,
    unavailableBanks,
  };
  await context.audit.record({
    action: "financing.readiness.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "financing_readiness",
    metadata: {
      connected: readiness.connected,
      mapped: readiness.mapped,
      permission: financingSimulationReadPermission,
      provider,
      usableBankCount: readiness.usableBankCount,
      unavailableBankCount: readiness.unavailableBankCount,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Read financing simulation readiness",
    tenantId: scope.tenantId,
  });
  return readiness;
}

function unavailableBankReason(
  bank: FinancingIntegratedBank,
): FinancingReadiness["unavailableBanks"][number]["reason"] {
  if (!bank.active) return "inactive";
  if (bank.status === "unauthorized") return "authorization_required";
  return "provider_error";
}
