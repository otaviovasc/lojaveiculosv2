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

export const resaleAnalysisSchema = z.object({
  acquisitionPriceCents: nullableNumber,
  brand: nullableString,
  color: nullableString,
  fipePriceCents: nullableNumber,
  fuel: nullableString,
  manufactureYear: nullableNumber,
  metadata: z.array(metadataItemSchema).default([]),
  mileageKm: nullableNumber,
  model: nullableString,
  modelYear: nullableNumber,
  plate: nullableString,
  recommendedAcquisitionPriceCents: nullableNumber,
  recommendedSellingPriceCents: nullableNumber,
  sellingPriceCents: nullableNumber,
  transmission: nullableString,
  version: nullableString,
});
