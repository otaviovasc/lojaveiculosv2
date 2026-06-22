import { z } from "zod";
import { listingStatuses } from "./listingServices.js";

export const listListingsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  search: z.string().trim().min(1).optional(),
  status: z.enum(listingStatuses).optional(),
});

const vehicleCatalogTypes = ["cars", "motorcycles", "trucks"] as const;
const listingCatalogSchema = z.object({
  brandCode: z.string().trim().min(1).nullable(),
  brandName: z.string().trim().min(1).nullable(),
  fipeCode: z.string().trim().min(1).nullable(),
  fuel: z.string().trim().min(1).nullable(),
  modelCode: z.string().trim().min(1).nullable(),
  modelName: z.string().trim().min(1).nullable(),
  modelYear: z.number().int().min(1886).max(2100).nullable(),
  referenceMonth: z.string().trim().min(1).nullable(),
  source: z.literal("fipe").nullable(),
  vehicleType: z.enum(vehicleCatalogTypes).nullable(),
  yearCode: z.string().trim().min(1).nullable(),
  yearName: z.string().trim().min(1).nullable(),
});

export const createListingSchema = z.object({
  catalog: listingCatalogSchema.nullable().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  manufactureYear: z.number().int().min(1886).max(2100).nullable().optional(),
  modelYear: z.number().int().min(1886).max(2100).nullable().optional(),
  plate: z.string().trim().min(1).nullable().default(null),
  priceCents: z.number().int().nonnegative().nullable().optional(),
  status: z.enum(listingStatuses).optional(),
  title: z.string().trim().min(1),
  trimName: z.string().trim().min(1).max(160).nullable().optional(),
});

export const descriptionSchema = z.object({
  description: z.string().trim().min(1),
});

export const priceSchema = z.object({
  priceCents: z.number().int().nonnegative().nullable(),
  reason: z.string().trim().min(1).nullable().optional(),
});

export const updateListingDetailsSchema = z.object({
  catalog: listingCatalogSchema.nullable().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  manufactureYear: z.number().int().min(1886).max(2100).nullable().optional(),
  modelYear: z.number().int().min(1886).max(2100).nullable().optional(),
  priceCents: z.number().int().nonnegative().nullable().optional(),
  status: z.enum(listingStatuses).optional(),
  title: z.string().trim().min(1).optional(),
  trimName: z.string().trim().min(1).max(160).nullable().optional(),
});

export const attachUnitSchema = z.object({
  plate: z.string().trim().min(1).nullable().optional(),
  stockNumber: z.string().trim().min(1).nullable().optional(),
  vin: z.string().trim().min(1).nullable().optional(),
});

export const updateUnitSchema = z.object({
  plate: z.string().trim().min(1).nullable().optional(),
  status: z.enum(["available", "reserved", "retired", "sold"]).optional(),
  stockNumber: z.string().trim().min(1).nullable().optional(),
  vin: z.string().trim().min(1).nullable().optional(),
});

const mediaKinds = ["document_preview", "photo", "video"] as const;
const documentKinds = [
  "buyer_document",
  "delivery_term",
  "inspection",
  "internal",
  "invoice",
  "other",
  "power_of_attorney",
  "reservation_receipt",
  "sale_receipt",
  "sale_contract",
  "test_drive",
  "vehicle_registration",
] as const;
const documentTargetTypes = ["vehicle_listing", "vehicle_unit"] as const;
export const catalogQuerySchema = z.object({
  vehicleType: z.enum(vehicleCatalogTypes).optional(),
});

export const catalogSnapshotQuerySchema = z.object({
  brandCode: z.string().trim().min(1),
  modelCode: z.string().trim().min(1),
  vehicleType: z.enum(vehicleCatalogTypes).optional(),
  yearCode: z.string().trim().min(1),
});

export const mediaUploadSchema = z.object({
  contentType: z.string().trim().min(1).max(120),
  fileName: z.string().trim().min(1).max(191),
  kind: z.enum(mediaKinds).default("photo"),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
});

export const createMediaSchema = z.object({
  altText: z.string().trim().min(1).max(191).nullable().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
  kind: z.enum(mediaKinds).default("photo"),
  storageKey: z.string().trim().min(1),
});

export const updateMediaSchema = z.object({
  altText: z.string().trim().min(1).max(191).nullable().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
  isPublic: z.boolean().optional(),
});

export const reorderMediaSchema = z.object({
  items: z
    .array(
      z.object({
        displayOrder: z.number().int().nonnegative(),
        mediaId: z.string().trim().min(1),
      }),
    )
    .min(1),
});

export const documentUploadSchema = z.object({
  contentType: z.string().trim().min(1).max(120),
  fileName: z.string().trim().min(1).max(191),
  kind: z.enum(documentKinds),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
  targetId: z.string().trim().min(1).optional(),
  targetType: z.enum(documentTargetTypes).optional(),
});

export const attachDocumentSchema = z.object({
  fileName: z.string().trim().min(1).max(191),
  fileSizeBytes: z.number().int().positive().nullable().optional(),
  kind: z.enum(documentKinds),
  linkRole: z.string().trim().min(1).max(80).optional(),
  mimeType: z.string().trim().min(1).max(120).nullable().optional(),
  storageKey: z.string().trim().min(1),
  targetId: z.string().trim().min(1).optional(),
  targetType: z.enum(documentTargetTypes).optional(),
  title: z.string().trim().min(1).max(191),
});

export const statusSchema = z.object({
  reason: z.string().trim().min(1).nullable().optional(),
  status: z.enum(listingStatuses),
});

export const costSchema = z.object({
  amountCents: z.number().int().positive(),
  costDate: z.coerce.date().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  kind: z.enum([
    "acquisition",
    "fee",
    "other",
    "preparation",
    "repair",
    "tax",
    "transport",
  ]),
  unitId: z.string().trim().min(1).optional(),
});

const buyerSchema = z.object({
  address: z.string().trim().min(1).nullable().optional(),
  document: z.string().trim().min(1).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1).nullable().optional(),
});

export const reserveListingSchema = z.object({
  buyer: buyerSchema,
  paymentMethod: z.string().trim().min(1).default("pix"),
  reason: z.string().trim().min(1).nullable().optional(),
  salePriceCents: z.number().int().positive().nullable().optional(),
  signalAmountCents: z.number().int().positive(),
  unitId: z.string().trim().min(1),
});

export const sellListingSchema = z.object({
  buyer: buyerSchema,
  paidAmountCents: z.number().int().positive().nullable().optional(),
  paymentMethod: z.string().trim().min(1).default("pix"),
  reason: z.string().trim().min(1).nullable().optional(),
  salePriceCents: z.number().int().positive().nullable().optional(),
  unitId: z.string().trim().min(1),
});
