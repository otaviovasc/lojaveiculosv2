import { z } from "zod";

export const plateLookupSchema = z.object({
  plate: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}[0-9][A-Za-z0-9][0-9]{2}$/),
});

const metadataItemSchema = z.object({
  label: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

const nullableString = z.string().trim().min(1).nullable();
const nullableNumber = z.number().int().nonnegative().nullable();
const optionalNullableString = nullableString.default(null);

const marketSignalSchema = z.object({
  code: z.enum([
    "chinese_electrified_liquidity_context",
    "chinese_new_vehicle_pressure",
    "consignment_strategy_context",
    "possible_rental_history",
    "rental_fleet_supply_pressure",
  ]),
  message: z.string().trim().min(1),
  severity: z.enum(["info", "risk", "watch"]),
  title: z.string().trim().min(1),
});

const marketContextSchema = z
  .object({
    priceBand: optionalNullableString,
    referenceDate: z.string().trim().min(1),
    segment: optionalNullableString,
    signals: z.array(marketSignalSchema).default([]),
  })
  .nullable()
  .default(null);

export const resaleAnalysisSchema = z.object({
  acquisitionPriceCents: nullableNumber,
  bodyType: optionalNullableString,
  brand: nullableString,
  city: optionalNullableString,
  color: nullableString,
  fipePriceCents: nullableNumber,
  fuel: nullableString,
  manufactureYear: nullableNumber,
  marketContext: marketContextSchema,
  metadata: z.array(metadataItemSchema).default([]),
  mileageKm: nullableNumber,
  model: nullableString,
  modelYear: nullableNumber,
  origin: optionalNullableString,
  plate: nullableString,
  recommendedAcquisitionPriceCents: nullableNumber,
  recommendedSellingPriceCents: nullableNumber,
  sellingPriceCents: nullableNumber,
  state: optionalNullableString,
  transmission: nullableString,
  vehicleType: optionalNullableString,
  version: nullableString,
});
