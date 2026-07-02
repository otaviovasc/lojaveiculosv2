import { FiscalValidationError } from "../domain/fiscalErrors.js";

type JsonRecord = Record<string, unknown>;

export type NfeVehiclePayloadResult = {
  providerPayload: JsonRecord;
};

export function readNfeVehiclePayload(
  metadata: Record<string, unknown> | undefined,
): NfeVehiclePayloadResult | null {
  const source = asRecord(metadata?.vehicleNfe);
  const required = metadata?.requireVehicleNfeValidation === true;
  if (!source) {
    if (required) {
      throw new FiscalValidationError("Vehicle NF-e data is required.", {
        missingFields: ["vehicleNfe"],
      });
    }
    return null;
  }
  return { providerPayload: buildNfeVehicleProviderPayload(source) };
}

export function buildNfeVehicleProviderPayload(source: JsonRecord) {
  const vehicle = asRecord(source.vehicle) ?? {};
  const buyer = asRecord(source.buyer) ?? {};
  const fiscal = asRecord(source.fiscal) ?? {};
  const sale = asRecord(source.sale) ?? {};
  const operation = asRecord(source.operation) ?? {};
  const missingFields = findMissingVehicleNfeFields({
    buyer,
    fiscal,
    operation,
    sale,
    vehicle,
  });
  if (missingFields.length) {
    throw new FiscalValidationError("Vehicle NF-e data is incomplete.", {
      missingFields,
    });
  }

  const amount = amountFrom(sale.price, vehicle.salePrice);
  const modelYear = numberFrom(vehicle.modelYear, vehicle.year);
  const fiscalOrigin = stringFrom(fiscal.origin);
  const cst = stringFrom(fiscal.cst);
  const csosn = stringFrom(fiscal.csosn);
  const description = [
    stringFrom(vehicle.brand),
    stringFrom(vehicle.model),
    stringFrom(vehicle.version),
    modelYear ? String(modelYear) : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    item: {
      cfop: numberFrom(fiscal.cfop) ?? stringFrom(fiscal.cfop),
      code: stringFrom(vehicle.id),
      description,
      ncm: stringFrom(fiscal.ncm),
      quantity: 1,
      totalAmount: amount,
      unit: "UN",
      unitAmount: amount,
      unitTax: "UN",
      unitTaxAmount: amount,
      taxes: {
        cofins: asRecord(fiscal.cofins) ?? undefined,
        icms: {
          ...(fiscalOrigin ? { origin: fiscalOrigin } : {}),
          ...(cst ? { cst } : {}),
          ...(csosn ? { csosn } : {}),
          ...(asRecord(fiscal.icms) ?? {}),
        },
        ipi: asRecord(fiscal.ipi) ?? undefined,
        pis: asRecord(fiscal.pis) ?? undefined,
      },
      specificProduct: createSpecificProduct(vehicle, operation),
    },
    receiver: {
      federalTaxNumber: digitsOnly(stringFrom(buyer.document)),
      name: stringFrom(buyer.name),
    },
    sale: {
      amount,
      id: stringFrom(sale.id),
    },
  };
}

function findMissingVehicleNfeFields(input: {
  buyer: JsonRecord;
  fiscal: JsonRecord;
  operation: JsonRecord;
  sale: JsonRecord;
  vehicle: JsonRecord;
}) {
  const missing = [
    requireField("vehicle.id", input.vehicle.id),
    requireField("vehicle.brand", input.vehicle.brand),
    requireField("vehicle.model", input.vehicle.model),
    input.vehicle.modelYear || input.vehicle.year ? null : "vehicle.modelYear",
    requireAmount(
      "sale.price",
      amountFrom(input.sale.price, input.vehicle.salePrice),
    ),
    requireField("buyer.name", input.buyer.name),
    requireDocument("buyer.document", input.buyer.document),
    requireField("fiscal.ncm", input.fiscal.ncm),
    requireField("fiscal.cfop", input.fiscal.cfop),
    requireField("fiscal.origin", input.fiscal.origin),
    input.fiscal.cst || input.fiscal.csosn ? null : "fiscal.cst_or_csosn",
  ].filter((value): value is string => Boolean(value));

  if (isNewVehicle(input.vehicle, input.operation) && !input.vehicle.chassis) {
    missing.push("vehicle.chassis");
  }
  return missing;
}

function createSpecificProduct(vehicle: JsonRecord, operation: JsonRecord) {
  const chassis = stringFrom(vehicle.chassis);
  if (!chassis) return undefined;
  return {
    vehicle: {
      chassis: chassis.toUpperCase(),
      colorDescription: stringFrom(vehicle.color),
      condition: stringFrom(vehicle.condition),
      fuelType: stringFrom(vehicle.fuelType),
      manufactureYear: numberFrom(vehicle.manufactureYear, vehicle.year),
      modelYear: numberFrom(vehicle.modelYear, vehicle.year),
      odometer: numberFrom(vehicle.odometer),
      operationType: stringFrom(operation.type),
      plate: stringFrom(vehicle.plate),
      renavam: stringFrom(vehicle.renavam),
    },
  };
}

function isNewVehicle(vehicle: JsonRecord, operation: JsonRecord) {
  return vehicle.condition === "new" || operation.type === "new_vehicle_sale";
}

function requireField(name: string, value: unknown) {
  return stringFrom(value) ? null : name;
}

function requireDocument(name: string, value: unknown) {
  const digits = digitsOnly(stringFrom(value));
  return digits.length === 11 || digits.length === 14 ? null : name;
}

function requireAmount(name: string, value: number | undefined) {
  return value !== undefined && value > 0 ? null : name;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringFrom(value: unknown) {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value.replace(",", "."))
          : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function amountFrom(...values: unknown[]) {
  const value = numberFrom(...values);
  return value && value > 0 ? value : undefined;
}

function digitsOnly(value: string | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}
