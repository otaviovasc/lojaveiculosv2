import type { FinancingSimulationInput } from "../ports/financingProviderGateway.js";
import type { CreateCredereSimulationInput } from "../services/FinancingService/types.js";

export function buildCredereSimulationRequest(input: {
  bankCodes: readonly string[];
  leadCpfCnpj: string;
  request: CreateCredereSimulationInput;
  sellerCpf: string;
  vehicle: FinancingSimulationInput["vehicle"];
}): FinancingSimulationInput {
  const { bankCodes, leadCpfCnpj, request, sellerCpf, vehicle } = input;
  return {
    ...(request.accessoryValueCents
      ? { accessoryValueCents: request.accessoryValueCents }
      : {}),
    assetValueCents: request.vehicle.assetValueCents,
    bankFebrabanCodes: [...bankCodes],
    conditions: request.installmentCounts.map((installments) => ({
      downPaymentCents: request.downPaymentCents,
      financedAmountCents: request.amountCents,
      installments,
    })),
    ...(request.documentationValueCents
      ? { documentationValueCents: request.documentationValueCents }
      : {}),
    ...(request.insuranceValueCents
      ? { insuranceValueCents: request.insuranceValueCents }
      : {}),
    processBankSuggestedConditions: request.processBankSuggestedConditions,
    retrieveLeadCpfCnpj: leadCpfCnpj,
    sellerCpf,
    vehicle,
  };
}
