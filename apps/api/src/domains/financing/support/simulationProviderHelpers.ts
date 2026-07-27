import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  FinancingCondition,
  FinancingInquiry,
  FinancingProvider,
  FinancingTokenSet,
} from "../ports/financingRepository.js";
import type { FinancingSimulation } from "../ports/financingProviderGateway.js";
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
  input: CreateCredereSimulationInput,
  scope: { storeId: StoreId; tenantId: TenantId },
  providerStoreId: string,
  token: FinancingTokenSet,
  ports: FinancingServicePorts,
) {
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
  const requested = new Set(input.bankCodes?.map(normalizeBankCode));
  const policySet = policy ? new Set(policy.map(normalizeBankCode)) : null;
  const cacheSet = credentials.length
    ? new Set(credentials.map((bank) => normalizeBankCode(bank.code)))
    : null;
  const codes = integratedBanks
    .filter((bank) => bank.active && bank.status === "okay")
    .map((bank) => normalizeBankCode(bank.code))
    .filter((code) => !policySet || policySet.has(code))
    .filter((code) => !cacheSet || cacheSet.has(code))
    .filter((code) => requested.size === 0 || requested.has(code));
  const unique = [...new Set(codes)];
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
    installments: input.installments,
    listingId: input.listingId ?? null,
    unitId: input.unitId ?? null,
    vehicle: input.vehicle,
  };
}

export function toSanitizedMetadata(input: CreateCredereSimulationInput) {
  return {
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
