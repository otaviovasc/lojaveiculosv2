import { isValidPreflightDocument } from "./applicantPreflight";
import type { CredereSimulationDraft } from "./types";

export type SimulationDraftInput = {
  accessoryValue: number | null;
  bankCodes: readonly string[];
  birthDate: string;
  channel: string;
  consent: boolean;
  cpfCnpj: string;
  credereVehicleModelId: string;
  documentationValue: number | null;
  downPayment: number | null;
  email: string;
  fipeCode: string;
  hasCnh: boolean | null;
  income: number | null;
  installments: string;
  insuranceValue: number | null;
  leadId: string;
  licensingCity: string;
  licensingUf: string;
  listingId: string;
  manufactureYear: string;
  modelYear: string;
  molicarCode: string;
  name: string;
  phone: string;
  preflightReady: boolean;
  requiredFields: ReadonlySet<string>;
  unitId: string;
  unsupportedFieldCount: number;
  vehicleValue: number | null;
  zeroKm: boolean;
};

export function buildSimulationDraft(
  input: SimulationDraftInput,
):
  | { draft: CredereSimulationDraft; error: null }
  | { draft: null; error: string } {
  const error = validateSimulationDraft(input);
  if (error) return { draft: null, error };
  const vehicleValueCents = Math.round((input.vehicleValue ?? 0) * 100);
  const downPaymentCents = Math.round((input.downPayment ?? 0) * 100);
  return {
    error: null,
    draft: {
      applicant: {
        ...(input.birthDate ? { birthDate: input.birthDate } : {}),
        ...(input.hasCnh !== null ? { hasCnh: input.hasCnh } : {}),
        name: input.name,
        cpfCnpj: input.cpfCnpj,
        phone: input.phone,
        ...(input.email.trim() ? { email: input.email } : {}),
        ...(input.income && input.income > 0
          ? { monthlyIncomeCents: Math.round(input.income * 100) }
          : {}),
      },
      ...(input.accessoryValue && input.accessoryValue > 0
        ? { accessoryValueCents: Math.round(input.accessoryValue * 100) }
        : {}),
      consent: {
        acceptedTerms: true,
        acceptedAt: new Date().toISOString(),
        channel: input.channel,
        policyVersion: "v1",
      },
      ...(input.documentationValue && input.documentationValue > 0
        ? {
            documentationValueCents: Math.round(input.documentationValue * 100),
          }
        : {}),
      downPaymentCents,
      installments:
        input.installments === "all"
          ? [12, 24, 36, 48, 60]
          : [Number(input.installments)],
      ...(input.insuranceValue && input.insuranceValue > 0
        ? { insuranceValueCents: Math.round(input.insuranceValue * 100) }
        : {}),
      ...(input.leadId ? { leadId: input.leadId } : {}),
      ...(input.listingId ? { listingId: input.listingId } : {}),
      ...(input.unitId ? { unitId: input.unitId } : {}),
      requestedBankCodes: [...input.bankCodes],
      vehicle: {
        credereVehicleModelId: input.credereVehicleModelId,
        fipeCode: input.fipeCode,
        priceCents: vehicleValueCents,
        manufactureYear: Number(input.manufactureYear),
        modelYear: Number(input.modelYear),
        licensingCity: input.licensingCity,
        licensingUf: input.licensingUf.trim().toUpperCase(),
        molicarCode: input.molicarCode,
        zeroKm: input.zeroKm,
      },
    },
  };
}

function validateSimulationDraft(input: SimulationDraftInput) {
  if (!input.name.trim()) return "Informe o nome do proponente.";
  if (!isValidPreflightDocument(input.cpfCnpj))
    return "Informe um CPF/CNPJ válido para consultar o Credere.";
  if (!input.preflightReady)
    return "Confira os dados exigidos pelo Credere antes de simular.";
  if (input.requiredFields.has("birthDate") && !input.birthDate)
    return "Informe a data de nascimento exigida pelos bancos.";
  if (input.requiredFields.has("hasCnh") && input.hasCnh === null)
    return "Informe se o proponente possui CNH.";
  if (input.requiredFields.has("email") && !input.email.trim())
    return "Informe o e-mail exigido pelos bancos.";
  if (input.requiredFields.has("monthlyIncomeCents") && !input.income)
    return "Informe a renda mensal exigida pelos bancos.";
  if (!input.phone.replace(/\D/g, ""))
    return "Informe o telefone do proponente.";
  if (!input.vehicleValue || input.vehicleValue <= 0)
    return "Informe o valor do veículo.";
  if (!input.downPayment || input.downPayment <= 0)
    return "Informe um valor de entrada válido.";
  if (input.downPayment >= input.vehicleValue)
    return "A entrada deve ser menor que o valor do veículo.";
  if (!Number(input.manufactureYear) || !Number(input.modelYear))
    return "Informe os anos de fabricação e modelo do veículo.";
  if (
    !input.fipeCode.trim() ||
    !input.molicarCode.trim() ||
    !input.credereVehicleModelId
  )
    return "Consulte a FIPE e confirme a versão Molicar antes de simular.";
  if (!input.licensingUf.trim()) return "Informe a UF de licenciamento.";
  if (!input.licensingCity.trim()) return "Informe a cidade de licenciamento.";
  if (input.bankCodes.length === 0)
    return "Selecione ao menos uma instituição financeira.";
  if (!input.consent)
    return "Confirme o consentimento do proponente para consultar os bancos.";
  return null;
}
