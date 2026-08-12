import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  FinancingCondition,
  FinancingInquiry,
  FinancingProvider,
  FinancingTokenSet,
} from "../ports/financingRepository.js";
import type {
  FinancingIntegratedBank,
  FinancingSimulation,
} from "../ports/financingProviderGateway.js";
import type { CreateCredereSimulationInput } from "../services/FinancingService/types.js";
import {
  getFinancingGateway,
  normalizeBankCode,
  normalizeDocument,
  now,
  sha256Hex,
  FinancingNoUsableBanksError,
  type FinancingServicePorts,
} from "../services/FinancingService/serviceSupport.js";

const provider = "credere" satisfies FinancingProvider;

export async function resolveUsableBankCodes(
  requestedBankCodes: readonly string[] | undefined,
  scope: { storeId: StoreId; tenantId: TenantId },
  providerStoreId: string,
  token: FinancingTokenSet,
  ports: FinancingServicePorts,
) {
  const banks = await resolveUsableBanks(
    requestedBankCodes,
    scope,
    providerStoreId,
    token,
    ports,
  );
  return banks.map((bank) => normalizeBankCode(bank.code));
}

export async function resolveUsableBanks(
  requestedBankCodes: readonly string[] | undefined,
  scope: { storeId: StoreId; tenantId: TenantId },
  providerStoreId: string,
  token: FinancingTokenSet,
  ports: FinancingServicePorts,
): Promise<FinancingIntegratedBank[]> {
  const [credentials, integratedBanks, policy] = await Promise.all([
    ports.repository.listActiveOkayBankCredentials({
      provider,
      providerStoreId,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    }),
    getFinancingGateway(ports).listIntegratedBanks({
      credereStoreId: providerStoreId,
      token,
    }),
    ports.repository.readStoreBankPolicy({
      provider,
      providerStoreId,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    }),
  ]);
  const requested = new Set(requestedBankCodes?.map(normalizeBankCode));
  const policySet = policy ? new Set(policy.map(normalizeBankCode)) : null;
  const cacheSet = credentials.length
    ? new Set(credentials.map((bank) => normalizeBankCode(bank.code)))
    : null;
  const banks = integratedBanks
    .filter((bank) => bank.active && bank.status === "okay")
    .filter((bank) => {
      const code = normalizeBankCode(bank.code);
      return (
        (!policySet || policySet.has(code)) &&
        (!cacheSet || cacheSet.has(code)) &&
        (requested.size === 0 || requested.has(code))
      );
    });
  const unique = [
    ...new Map(
      banks.map((bank) => [normalizeBankCode(bank.code), bank]),
    ).values(),
  ];
  if (unique.length === 0) throw new FinancingNoUsableBanksError();
  return unique;
}

export async function upsertCredereLead(
  providerStoreId: string,
  token: FinancingTokenSet,
  input: CreateCredereSimulationInput,
  ports: FinancingServicePorts,
) {
  const gateway = getFinancingGateway(ports);
  const cpfCnpj = normalizeDocument(input.customer.document);
  const lead = {
    cpfCnpj,
    name: input.customer.name,
    phoneNumber: input.customer.phone,
    ...(input.customer.birthDate
      ? { birthdate: input.customer.birthDate }
      : {}),
    ...(input.customer.email ? { email: input.customer.email } : {}),
    ...(input.customer.hasCnh !== undefined
      ? { hasCnh: input.customer.hasCnh }
      : {}),
    ...(input.customer.monthlyIncomeCents
      ? { monthlyIncomeCents: input.customer.monthlyIncomeCents }
      : {}),
  };
  const request = { credereStoreId: providerStoreId, token, lead };
  const existing = await gateway.getLead({
    credereStoreId: providerStoreId,
    cpfCnpj,
    token,
  });
  return existing
    ? gateway.updateLead({ ...request, cpfCnpj })
    : gateway.createLead(request);
}

export function completeFromProvider(
  inquiry: FinancingInquiry,
  simulation: FinancingSimulation,
  ports: FinancingServicePorts,
) {
  return ports.repository.completeInquiry({
    completedAt: now(ports),
    conditions: simulation.conditions.map((condition) =>
      toCondition(condition, inquiry.installments),
    ),
    inquiryId: inquiry.id,
    providerInquiryId: simulation.uuid,
    providerRequestId: simulation.providerRequestId,
    reason: simulation.reason,
    status:
      simulation.status === "completed"
        ? "completed"
        : simulation.status === "failed"
          ? "failed"
          : "submitted",
    storeId: inquiry.storeId,
    success: simulation.success,
    tenantId: inquiry.tenantId,
  });
}

export function toFingerprint(
  input: CreateCredereSimulationInput,
  bankCodes: readonly string[],
) {
  return {
    amountCents: input.amountCents,
    bankCodes,
    customerDocumentHash: sha256Hex(normalizeDocument(input.customer.document)),
    downPaymentCents: input.downPaymentCents,
    installmentCounts: input.installmentCounts,
    insuranceValueCents: input.insuranceValueCents ?? null,
    accessoryValueCents: input.accessoryValueCents ?? null,
    documentationValueCents: input.documentationValueCents ?? null,
    listingId: input.listingId ?? null,
    processBankSuggestedConditions: input.processBankSuggestedConditions,
    unitId: input.unitId ?? null,
    vehicle: input.vehicle,
  };
}

export function toSanitizedMetadata(input: CreateCredereSimulationInput) {
  return {
    accessoryValueCents: input.accessoryValueCents ?? null,
    documentationValueCents: input.documentationValueCents ?? null,
    installmentCounts: input.installmentCounts,
    insuranceValueCents: input.insuranceValueCents ?? null,
    processBankSuggestedConditions: input.processBankSuggestedConditions,
    vehicle: input.vehicle,
  };
}

function toCondition(
  condition: FinancingSimulation["conditions"][number],
  requestedInstallments: number,
): Omit<FinancingCondition, "id" | "inquiryId"> {
  return {
    bankCode: condition.bankCode,
    bankName: condition.bankName ?? "Banco",
    installments: condition.installments ?? requestedInstallments,
    metadata: {
      downPaymentCents: condition.downPaymentCents,
      firstInstallmentCents: condition.firstInstallmentCents,
      reasonIdentifier: condition.reasonIdentifier,
    },
    status: condition.status,
    summary: condition.reason,
    totalAmountCents: condition.financedAmountCents,
  };
}
