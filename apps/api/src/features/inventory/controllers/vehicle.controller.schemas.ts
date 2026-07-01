import { vehicleColorValues } from "@lojaveiculosv2/shared";
import { z } from "zod";
import { allowedCreateStatuses } from "../../../domains/vehicle/services/VehicleService/createVehicleListing.js";
import {
  documentKinds,
  listingStatuses,
  mediaKinds,
  unitStatuses,
} from "./vehicle.controller.statuses.js";
import {
  listingCatalogSchema,
  listingTechnicalSchemaShape,
  vehicleCatalogTypes,
} from "./vehicle.controller.schemaParts.js";
import { listingDescriptionTextSchema } from "./vehicleDescriptionRichText.js";

export const listListingsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  search: z.string().trim().min(1).optional(),
  status: z.enum(listingStatuses).optional(),
});

export const listUnitsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  search: z.string().trim().min(1).optional(),
  status: z.enum(unitStatuses).optional(),
});

const vehicleColorSchema = z.enum(vehicleColorValues);

export const createListingSchema = z.object({
  catalog: listingCatalogSchema.nullable().optional(),
  description: listingDescriptionTextSchema.nullable().optional(),
  ...listingTechnicalSchemaShape,
  plate: z.string().trim().min(1).nullable().default(null),
  priceCents: z.number().int().nonnegative().nullable().optional(),
  status: z.enum(allowedCreateStatuses).optional(),
  title: z.string().trim().min(1),
});

export const descriptionSchema = z.object({
  description: listingDescriptionTextSchema,
});

export const priceSchema = z.object({
  priceCents: z.number().int().nonnegative().nullable(),
  reason: z.string().trim().min(1).nullable().optional(),
});

export const updateListingDetailsSchema = z.object({
  catalog: listingCatalogSchema.nullable().optional(),
  description: listingDescriptionTextSchema.nullable().optional(),
  ...listingTechnicalSchemaShape,
  priceCents: z.number().int().nonnegative().nullable().optional(),
  status: z.enum(listingStatuses).optional(),
  title: z.string().trim().min(1).optional(),
});

export const attachUnitSchema = z.object({
  colorName: vehicleColorSchema.nullable().optional(),
  plate: z.string().trim().min(1).nullable().optional(),
  stockNumber: z.string().trim().min(1).nullable().optional(),
  vin: z.string().trim().min(1).nullable().optional(),
});

export const updateUnitSchema = z.object({
  colorName: vehicleColorSchema.nullable().optional(),
  plate: z.string().trim().min(1).nullable().optional(),
  status: z.enum(unitStatuses).optional(),
  stockNumber: z.string().trim().min(1).nullable().optional(),
  vin: z.string().trim().min(1).nullable().optional(),
});
export const catalogQuerySchema = z.object({
  vehicleType: z.enum(vehicleCatalogTypes).optional(),
});

export const catalogSnapshotQuerySchema = z.object({
  brandCode: z.string().trim().min(1),
  modelCode: z.string().trim().min(1),
  vehicleType: z.enum(vehicleCatalogTypes).optional(),
  yearCode: z.string().trim().min(1),
});

export const catalogPriceHistoryQuerySchema = z.object({
  referenceCode: z.string().trim().min(1).optional(),
  vehicleType: z.enum(vehicleCatalogTypes).optional(),
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
});

export const attachDocumentSchema = z.object({
  fileName: z.string().trim().min(1).max(191),
  fileSizeBytes: z.number().int().positive().nullable().optional(),
  kind: z.enum(documentKinds),
  linkRole: z.string().trim().min(1).max(80).optional(),
  mimeType: z.string().trim().min(1).max(120).nullable().optional(),
  storageKey: z.string().trim().min(1),
  title: z.string().trim().min(1).max(191),
});

export const statusSchema = z.object({
  reason: z.string().trim().min(1).nullable().optional(),
  status: z.enum(listingStatuses),
});

export const publishListingSchema = z.object({
  publicSlug: z.string().trim().min(1).max(191).nullable().optional(),
  reason: z.string().trim().min(1).nullable().optional(),
});

export const unpublishListingSchema = z.object({
  reason: z.string().trim().min(1).nullable().optional(),
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
});

const checklistItemSchema = z.object({
  id: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).max(160),
  notes: z.string().trim().min(1).max(500).nullable().optional(),
  status: z.enum(["failed", "passed", "pending", "waived"]).default("pending"),
});

export const createChecklistSchema = z.object({
  items: z.array(checklistItemSchema).min(1),
  name: z.string().trim().min(1).max(120),
  status: z
    .enum(["failed", "in_progress", "passed", "pending", "waived"])
    .optional(),
});

export const updateChecklistSchema = z.object({
  items: z.array(checklistItemSchema).min(1).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  status: z
    .enum(["failed", "in_progress", "passed", "pending", "waived"])
    .optional(),
});

const buyerSchema = z.object({
  address: z.string().trim().min(1).nullable().optional(),
  document: z.string().trim().min(1).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1).nullable().optional(),
});

export const reserveUnitSchema = z.object({
  buyer: buyerSchema,
  paymentMethod: z.string().trim().min(1).default("pix"),
  reason: z.string().trim().min(1).nullable().optional(),
  salePriceCents: z.number().int().positive().nullable().optional(),
  signalAmountCents: z.number().int().positive(),
});

export const sellUnitSchema = z.object({
  buyer: buyerSchema,
  paidAmountCents: z.number().int().positive().nullable().optional(),
  paymentMethod: z.string().trim().min(1).default("pix"),
  reason: z.string().trim().min(1).nullable().optional(),
  salePriceCents: z.number().int().positive().nullable().optional(),
});

export const releaseReservationSchema = z.object({
  reason: z.string().trim().min(1).nullable().optional(),
  saleId: z.string().trim().min(1).nullable().optional(),
});
