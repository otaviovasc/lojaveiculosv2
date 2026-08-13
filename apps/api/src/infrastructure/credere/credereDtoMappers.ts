import type {
  FinancingIntegratedBank,
  FinancingLead,
  FinancingRequiredFields,
  FinancingSimulation,
  FinancingSimulationCondition,
  FinancingSimulationConditionStatus,
  FinancingSimulationInput,
  FinancingStore,
  FinancingVehicleModel,
} from "../../domains/financing/ports/financingProviderGateway.js";
import {
  readArray,
  readBoolean,
  readNumber,
  readRecord,
  readString,
} from "./credereHttpSupport.js";

export function isUsableCredereBank(bank: FinancingIntegratedBank) {
  return bank.active && bank.status === "okay";
}

export function mapStores(payload: Record<string, unknown>): FinancingStore[] {
  return readArray(payload.stores)
    .map(readRecord)
    .map((store) => {
      const active = readBoolean(store.active);
      return {
        cnpj: readString(store.cnpj),
        displayName: readString(store.display_name),
        id: readString(store.id) ?? "",
        name: readString(store.name),
        status:
          readString(store.status) ??
          (active === null ? null : active ? "active" : "inactive"),
      };
    })
    .filter((store) => store.id);
}

export function mapIntegratedBanks(
  payload: Record<string, unknown>,
): FinancingIntegratedBank[] {
  const seen = new Set<string>();
  return readArray(payload.banks)
    .map(readRecord)
    .map((bank) => {
      const credential = readRecord(bank.bank_credential);
      return {
        active: readBoolean(credential.active) ?? false,
        code: readString(bank.code) ?? "",
        name: readString(bank.name),
        status: readString(credential.status),
        tradename: readString(bank.tradename),
      };
    })
    .filter((bank) => {
      if (!isUsableCredereBank(bank) || seen.has(bank.code)) return false;
      seen.add(bank.code);
      return true;
    });
}

export function mapLead(payload: Record<string, unknown>): FinancingLead {
  const data = readRecord(payload.data);
  return {
    cpfCnpj: readString(data.cpf_cnpj) ?? "",
    id: readString(data.id) ?? "",
    name: readString(data.name),
  };
}

export function mapRequiredFields(
  payload: Record<string, unknown>,
): FinancingRequiredFields {
  const data = readRecord(payload.data);
  return {
    lead: Object.keys(readRecord(data.lead)).length
      ? mapLead({ data: data.lead })
      : null,
    requirements: flattenRequirements(readRecord(data.requirements)),
  };
}

export function mapVehicleModel(
  payload: Record<string, unknown>,
): FinancingVehicleModel | null {
  const model = readRecord(payload.vehicle_model);
  const id = readString(model.id);
  if (!id) return null;
  return {
    active: readBoolean(model.active) ?? false,
    brand:
      readString(model.brand) ??
      readString(readRecord(model.vehicle_brand).name),
    fipeCode: readString(model.fipe_code),
    id,
    molicarCode: readString(model.molicar_code),
    name: readString(model.name) ?? readString(model.model_name),
    version: readString(model.version),
    yearEnd: readNumber(model.year_end),
    yearStart: readNumber(model.year_start),
  };
}

export function simulationPayload(input: FinancingSimulationInput) {
  return {
    simulation: {
      accessory_value: input.accessoryValueCents,
      assets_value: input.assetValueCents,
      bank_febraban_codes: input.bankFebrabanCodes,
      commercial: input.commercial,
      conditions: input.conditions.map((condition) => ({
        bank_febraban_code: condition.bankFebrabanCode,
        down_payment: condition.downPaymentCents,
        financed_amount: condition.financedAmountCents,
        installments: condition.installments,
      })),
      documentation_value: input.documentationValueCents,
      insurance_value: input.insuranceValueCents,
      process_bank_suggested_conditions: input.processBankSuggestedConditions,
      retrieve_lead: { cpf_cnpj: input.retrieveLeadCpfCnpj },
      seller_cpf: input.sellerCpf,
      vehicle: {
        asset_value: input.vehicle.assetValueCents,
        credere_vehicle_model_id: input.vehicle.credereVehicleModelId,
        licensing_city: input.vehicle.licensingCity,
        licensing_uf: input.vehicle.licensingUf,
        manufacture_year: input.vehicle.manufactureYear,
        model_year: input.vehicle.modelYear,
        zero_km: input.vehicle.zeroKm,
      },
    },
  };
}

export function mapSimulation(
  payload: Record<string, unknown>,
  providerRequestId: string | null,
): FinancingSimulation {
  const data = readRecord(payload.data);
  const conditions = readArray(data.conditions)
    .map(readRecord)
    .map(mapCondition);
  return {
    conditions,
    createdAt: readString(data.created_at),
    providerRequestId,
    reason: readString(data.reason),
    status: simulationStatus(data, conditions),
    success: readBoolean(data.success),
    uuid: readString(data.uuid) ?? "",
  };
}

function mapCondition(
  condition: Record<string, unknown>,
): FinancingSimulationCondition {
  const bank = readRecord(condition.bank);
  return {
    available: readBoolean(condition.available) ?? false,
    bankCode: readString(bank.febraban_code) ?? readString(bank.code),
    bankName: readString(bank.nickname) ?? readString(bank.name),
    downPaymentCents: readNumber(condition.down_payment),
    financedAmountCents: readNumber(condition.financed_amount),
    firstInstallmentCents: readNumber(condition.first_installment_value),
    id: readString(condition.id) ?? "",
    installments: readNumber(condition.installments),
    preApprovalStatus: readNumber(condition.pre_approval_status),
    reason: readString(condition.reason),
    reasonIdentifier: readString(condition.reason_identifier),
    status: conditionStatus(condition),
  };
}

function conditionStatus(
  condition: Record<string, unknown>,
): FinancingSimulationConditionStatus {
  const task = readRecord(condition.process_task);
  if (!Object.keys(task).length || !readString(task.ended_at)) return "pending";
  if (
    readBoolean(condition.error) === true ||
    readBoolean(condition.success) === false
  ) {
    return "failed";
  }
  return readBoolean(condition.available) === true ? "available" : "rejected";
}

function simulationStatus(
  data: Record<string, unknown>,
  conditions: FinancingSimulationCondition[],
) {
  if (
    readBoolean(data.success) === false ||
    readBoolean(readRecord(data.process_task).error) === true
  ) {
    return "failed";
  }
  if (conditions.some((condition) => condition.status === "pending")) {
    return "pending";
  }
  if (
    conditions.length > 0 &&
    conditions.every((condition) => condition.status === "failed")
  ) {
    return "failed";
  }
  return "completed";
}

function flattenRequirements(requirements: Record<string, unknown>) {
  const flattened: Record<string, string[]> = {};
  for (const [field, banks] of Object.entries(requirements)) {
    if (Array.isArray(banks)) {
      flattened[field] = banks.map(readRequirementIdentifier).filter(isString);
    } else {
      const nested = readRecord(banks);
      for (const [nestedField, nestedBanks] of Object.entries(nested)) {
        flattened[`${field}.${nestedField}`] = readArray(nestedBanks)
          .map(readRequirementIdentifier)
          .filter(isString);
      }
    }
  }
  return flattened;
}

function readRequirementIdentifier(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : readString(value);
}

function isString(value: string | null): value is string {
  return value !== null;
}
