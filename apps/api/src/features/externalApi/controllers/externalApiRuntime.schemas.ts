import { z } from "zod";
import { listingStatuses } from "../../inventory/controllers/vehicle.controller.statuses.js";
import {
  leadSourceSchema,
  leadStatusSchema,
} from "../../crm/controllers/crm.controller.schemas.js";

const booleanQuerySchema = z
  .enum(["false", "true"])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === "true"));

const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(50);
const optionalPositiveMoneySchema = z.coerce.number().nonnegative().optional();

export const externalVehicleQuerySchema = z.object({
  available: booleanQuerySchema,
  color: z.string().trim().min(1).optional(),
  cor: z.string().trim().min(1).optional(),
  fuel: z.string().trim().min(1).optional(),
  fuelType: z.string().trim().min(1).optional(),
  limit: limitSchema,
  maxKm: z.coerce.number().int().nonnegative().optional(),
  maxMileageKm: z.coerce.number().int().nonnegative().optional(),
  maxPrice: optionalPositiveMoneySchema,
  maxPriceCents: optionalPositiveMoneySchema,
  maxYear: z.coerce.number().int().min(1900).max(2200).optional(),
  minKm: z.coerce.number().int().nonnegative().optional(),
  minMileageKm: z.coerce.number().int().nonnegative().optional(),
  minPrice: optionalPositiveMoneySchema,
  minPriceCents: optionalPositiveMoneySchema,
  minYear: z.coerce.number().int().min(1900).max(2200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  page: pageSchema,
  q: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  sort: z
    .enum([
      "highlight",
      "km_asc",
      "km_desc",
      "price_asc",
      "price_desc",
      "recent",
      "year_asc",
      "year_desc",
    ])
    .default("recent"),
  status: z.enum(listingStatuses).optional(),
  transmission: z.string().trim().min(1).optional(),
});

export const externalLeadQuerySchema = z.object({
  limit: limitSchema,
  listingId: z.string().trim().min(1).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  page: pageSchema,
  phone: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  source: leadSourceSchema.optional(),
  status: leadStatusSchema.optional(),
});

export const externalCreateLeadSchema = z.object({
  buyerEmail: z.string().email().nullable().optional(),
  buyerName: z.string().trim().min(1).max(191).nullable().optional(),
  buyerPhone: z.string().trim().min(3).max(40).nullable().optional(),
  email: z.string().email().nullable().optional(),
  listingId: z.string().trim().min(1).nullable().optional(),
  message: z.string().trim().min(1).max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().trim().min(1).max(191).optional(),
  phone: z.string().trim().min(3).max(40).nullable().optional(),
  source: leadSourceSchema.default("external_api"),
  title: z.string().trim().min(1).max(191).nullable().optional(),
  vehicleId: z.string().trim().min(1).nullable().optional(),
});

export const externalUpdateLeadSchema = z.object({
  buyerEmail: z.string().email().nullable().optional(),
  buyerName: z.string().trim().min(1).max(191).nullable().optional(),
  buyerPhone: z.string().trim().min(3).max(40).nullable().optional(),
  email: z.string().email().nullable().optional(),
  message: z.string().trim().min(1).max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().trim().min(1).max(191).optional(),
  phone: z.string().trim().min(3).max(40).nullable().optional(),
  status: leadStatusSchema.optional(),
});

export type ExternalVehicleQuery = z.infer<typeof externalVehicleQuerySchema>;
export type ExternalLeadQuery = z.infer<typeof externalLeadQuerySchema>;
export type ExternalCreateLeadInput = z.infer<typeof externalCreateLeadSchema>;
export type ExternalUpdateLeadInput = z.infer<typeof externalUpdateLeadSchema>;
