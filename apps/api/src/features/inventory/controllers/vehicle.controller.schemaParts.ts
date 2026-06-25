import { z } from "zod";
import {
  vehicleEngineAspirationValues,
  vehicleEngineDisplacementValues,
} from "@lojaveiculosv2/shared";

export const vehicleCatalogTypes = ["cars", "motorcycles", "trucks"] as const;
export const vehicleFuelTypes = [
  "diesel",
  "electric",
  "ethanol",
  "flex",
  "gasoline",
  "hybrid",
  "other",
] as const;
export const vehicleTransmissions = [
  "automated",
  "automatic",
  "cvt",
  "manual",
  "other",
] as const;

export const listingCatalogSchema = z.object({
  brandCode: z.string().trim().min(1).nullable(),
  brandLogoUrl: z.string().trim().url().nullable().optional().default(null),
  brandName: z.string().trim().min(1).nullable(),
  fipeCode: z.string().trim().min(1).nullable(),
  fuel: z.string().trim().min(1).nullable(),
  modelCode: z.string().trim().min(1).nullable(),
  modelName: z.string().trim().min(1).nullable(),
  modelYear: z.number().int().min(1886).max(2100).nullable(),
  priceCents: z.number().int().nonnegative().nullable().default(null),
  referenceMonth: z.string().trim().min(1).nullable(),
  source: z.literal("fipe").nullable(),
  vehicleType: z.enum(vehicleCatalogTypes).nullable(),
  yearCode: z.string().trim().min(1).nullable(),
  yearName: z.string().trim().min(1).nullable(),
});

export const listingTechnicalSchemaShape = {
  doors: z.number().int().positive().max(12).nullable().optional(),
  engineAspiration: z.enum(vehicleEngineAspirationValues).nullable().optional(),
  engineDisplacement: z
    .enum(vehicleEngineDisplacementValues)
    .nullable()
    .optional(),
  fuelType: z.enum(vehicleFuelTypes).nullable().optional(),
  internalNotes: z.string().trim().min(1).nullable().optional(),
  manufactureYear: z.number().int().min(1886).max(2100).nullable().optional(),
  mileageKm: z.number().int().nonnegative().nullable().optional(),
  modelYear: z.number().int().min(1886).max(2100).nullable().optional(),
  transmission: z.enum(vehicleTransmissions).nullable().optional(),
  trimName: z.string().trim().min(1).max(160).nullable().optional(),
};
