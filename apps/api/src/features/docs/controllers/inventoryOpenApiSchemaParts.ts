export const vehicleDocumentKinds = [
  "buyer_document",
  "delivery_term",
  "inspection",
  "internal",
  "invoice",
  "other",
  "power_of_attorney",
  "reservation_receipt",
  "sale_contract",
  "sale_receipt",
  "test_drive",
  "vehicle_registration",
] as const;

const vehicleFuelTypes = [
  "diesel",
  "electric",
  "ethanol",
  "flex",
  "gasoline",
  "hybrid",
  "other",
] as const;

const vehicleTransmissions = [
  "automated",
  "automatic",
  "cvt",
  "manual",
  "other",
] as const;

export const listingTechnicalSchemas = {
  doors: { type: ["integer", "null"], minimum: 1, maximum: 12 },
  engineDisplacement: {
    type: ["string", "null"],
    minLength: 1,
    maxLength: 32,
  },
  fuelType: { type: ["string", "null"], enum: vehicleFuelTypes },
  internalNotes: { type: ["string", "null"], minLength: 1 },
  manufactureYear: { type: ["integer", "null"], minimum: 1886 },
  mileageKm: { type: ["integer", "null"], minimum: 0 },
  modelYear: { type: ["integer", "null"], minimum: 1886 },
  transmission: { type: ["string", "null"], enum: vehicleTransmissions },
  trimName: { type: ["string", "null"], minLength: 1, maxLength: 160 },
} as const;

export const unitIdentitySchemas = {
  colorName: { type: ["string", "null"], minLength: 1, maxLength: 80 },
  plate: { type: ["string", "null"], minLength: 1 },
  stockNumber: { type: ["string", "null"], minLength: 1 },
  vin: { type: ["string", "null"], minLength: 1 },
} as const;

export function objectSchema(
  required: readonly string[],
  properties: Record<string, unknown>,
) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties,
  } as const;
}
