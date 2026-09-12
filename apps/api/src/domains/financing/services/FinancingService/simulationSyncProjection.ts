import type { FinancingSimulation } from "../../ports/financingProviderGateway.js";

type SimulationCondition = FinancingSimulation["conditions"][number];

export function uniqueBankCodes(
  conditions: readonly SimulationCondition[],
): string[] {
  return [
    ...new Set(
      conditions.flatMap((condition) =>
        condition.bankCode ? [condition.bankCode] : [],
      ),
    ),
  ];
}

export function persistableConditions(
  conditions: readonly SimulationCondition[],
) {
  return conditions.flatMap((condition) =>
    condition.installments === null || condition.installments <= 0
      ? []
      : [
          {
            bankCode: condition.bankCode,
            bankName: condition.bankName ?? "Banco",
            installments: condition.installments,
            metadata: {
              downPaymentCents: condition.downPaymentCents,
              firstInstallmentCents: condition.firstInstallmentCents,
              preApprovalStatus: condition.preApprovalStatus,
              reasonIdentifier: condition.reasonIdentifier,
            },
            status: condition.status,
            summary: condition.reason,
            totalAmountCents: condition.financedAmountCents,
          },
        ],
  );
}

export function sharedDownPayment(
  conditions: readonly SimulationCondition[],
): number | null {
  const values = [
    ...new Set(
      conditions.flatMap((condition) =>
        condition.downPaymentCents === null ? [] : [condition.downPaymentCents],
      ),
    ),
  ];
  return values.length === 1 ? values[0]! : null;
}
