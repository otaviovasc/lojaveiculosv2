import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import {
  formatDocumentKindLabel,
  isSaleDocumentKind,
  paymentPrincipalTotal,
  saleMissingFields,
} from "./salesModel";
import {
  asSnapshotRecord,
  snapshotBoolean,
  snapshotNumber,
} from "./salesSnapshot";
import type { SaleRecord } from "./types";
import { validateSaleRecord } from "./validation";

export type SaleWorkspaceStepReadiness = {
  isComplete: boolean;
  missingFields: readonly string[];
};

const contextFields = new Set(["Comprador", "Lead", "Veículo", "Vendedor"]);
const commercialFields = new Set([
  "Preço",
  "Pagamentos",
  "Data dos pagamentos",
  "Quantidade de parcelas",
  "Pagamento de financiamento",
  "Valor financiado",
  "Valor da documentação",
  "Gravame da documentação",
  "Prêmio do seguro",
  "Percentual de comissão do seguro",
  "Valor da comissão do seguro",
  "Ative o veículo na troca",
  "Valor de avaliação da troca",
  "Marca do veículo da troca",
  "Modelo do veículo da troca",
  "Placa do veículo da troca",
  "Ano de fabricação da troca",
  "Ano modelo da troca",
  "Cor do veículo da troca",
  "Chassi do veículo da troca",
  "Renavam do veículo da troca",
  "Pagamento da troca",
  "Pagamento duplicado da troca",
  "Valor da parcela de troca",
  "Total principal excede o preço da venda",
]);
const documentValidationLabels: Record<string, string> = {
  buyerAddress: "Endereço do comprador",
  buyerCity: "Cidade do comprador",
  buyerDocument: "CPF/CNPJ",
  buyerEstadoCivil: "Estado civil do comprador",
  buyerNacionalidade: "Nacionalidade do comprador",
  buyerProfissao: "Profissão do comprador",
  buyerState: "Estado do comprador",
  vehicleChassi: "Chassi",
  vehicleCilindrada: "Cilindradas",
  vehicleNumeroMotor: "Número do motor",
  vehiclePesoBruto: "Peso bruto",
  vehiclePesoLiquido: "Peso líquido",
  vehiclePotencia: "Potência do motor",
  vehicleRenavam: "Renavam",
};

export function getSaleWorkspaceStepReadiness(
  sale: SaleRecord,
): readonly SaleWorkspaceStepReadiness[] {
  const missingByStep: string[][] = [[], [], [], []];

  for (const field of getSaleCloseMissingFields(sale)) {
    const label = formatMissingField(field);
    const step = contextFields.has(field)
      ? 0
      : commercialFields.has(field)
        ? 1
        : 2;
    missingByStep[step]?.push(label);
    missingByStep[3]?.push(label);
  }

  return missingByStep.map((missingFields) => ({
    isComplete: missingFields.length === 0,
    missingFields,
  }));
}

export function getSaleCloseMissingFields(sale: SaleRecord): readonly string[] {
  const missing = saleMissingFields(sale, "close");
  const { errors } = validateSaleRecord(
    sale.buyerSnapshot,
    sale.listingSnapshot,
    sale.selectedDocumentKinds,
    sale.documentPolicySnapshot.emitirNFe === true,
  );
  const documentErrors = Object.keys(errors)
    .filter((field) => field !== "buyerName")
    .map((field) => documentValidationLabels[field] ?? field);
  return [
    ...new Set([
      ...missing,
      ...getTradeInCloseMissingFields(sale),
      ...getPaymentTotalMissingFields(sale),
      ...documentErrors,
    ]),
  ];
}

export function getTradeInSnapshotMissingFields(
  tradeIn: Record<string, unknown>,
): readonly string[] {
  const missing: string[] = [];
  const catalog = asSnapshotRecord(tradeIn.catalog);
  const brand = snapshotText(tradeIn.brand) || snapshotText(catalog.brandName);
  const model = snapshotText(tradeIn.model) || snapshotText(catalog.modelName);
  const plate = normalizedAlphaNumeric(tradeIn.plate);
  const chassi = normalizedAlphaNumeric(tradeIn.chassi);
  const renavam = normalizedDigits(tradeIn.renavam);

  if (!isPositiveSafeInteger(snapshotNumber(tradeIn.valuationCents))) {
    missing.push("Valor de avaliação da troca");
  }
  if (!brand) missing.push("Marca do veículo da troca");
  if (!model) missing.push("Modelo do veículo da troca");
  if (plate.length < 7) missing.push("Placa do veículo da troca");
  if (!isPositiveSafeInteger(snapshotNumber(tradeIn.yearFabrication))) {
    missing.push("Ano de fabricação da troca");
  }
  if (
    !isPositiveSafeInteger(
      snapshotNumber(tradeIn.yearModel) ?? snapshotNumber(catalog.modelYear),
    )
  ) {
    missing.push("Ano modelo da troca");
  }
  if (!snapshotText(tradeIn.color)) missing.push("Cor do veículo da troca");
  if (chassi.length !== 17) missing.push("Chassi do veículo da troca");
  if (renavam.length !== 11) missing.push("Renavam do veículo da troca");
  return missing;
}

function getTradeInCloseMissingFields(sale: SaleRecord): readonly string[] {
  const tradeIn = asSnapshotRecord(sale.saleSourceSnapshot.tradeIn);
  const tradeInPayments = sale.payments.filter(
    (payment) =>
      payment.method === "trade_in" &&
      isActiveSalePaymentStatus(payment.status),
  );
  const enabled = snapshotBoolean(tradeIn.enabled);
  if (!enabled && tradeInPayments.length === 0) return [];
  if (!enabled) return ["Ative o veículo na troca"];

  const missing = [...getTradeInSnapshotMissingFields(tradeIn)];
  if (tradeInPayments.length === 0) {
    missing.push("Pagamento da troca");
  } else if (tradeInPayments.length > 1) {
    missing.push("Pagamento duplicado da troca");
  } else {
    const valuation = snapshotNumber(tradeIn.valuationCents);
    if (
      isPositiveSafeInteger(valuation) &&
      tradeInPayments[0]?.principalCents !== valuation
    ) {
      missing.push("Valor da parcela de troca");
    }
  }
  return missing;
}

function getPaymentTotalMissingFields(sale: SaleRecord): readonly string[] {
  if (
    sale.salePriceCents !== null &&
    paymentPrincipalTotal(sale) > sale.salePriceCents
  ) {
    return ["Total principal excede o preço da venda"];
  }
  return [];
}

export function canNavigateToSaleWorkspaceStep({
  currentStep,
  readiness,
  sale,
  targetStep,
}: {
  currentStep: number;
  readiness: readonly SaleWorkspaceStepReadiness[];
  sale: SaleRecord;
  targetStep: number;
}): boolean {
  if (targetStep <= currentStep || sale.status !== "draft") return true;
  return readiness.slice(0, targetStep).every((step) => step.isComplete);
}

function formatMissingField(field: string): string {
  return isSaleDocumentKind(field) ? formatDocumentKindLabel(field) : field;
}

function isPositiveSafeInteger(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value > 0;
}

function normalizedAlphaNumeric(value: unknown): string {
  return snapshotText(value).replace(/[^A-Za-z0-9]/g, "");
}

function normalizedDigits(value: unknown): string {
  return snapshotText(value).replace(/\D/g, "");
}

function snapshotText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
