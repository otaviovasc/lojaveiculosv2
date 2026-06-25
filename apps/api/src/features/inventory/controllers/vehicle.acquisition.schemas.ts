import { z } from "zod";
import {
  vehicleAcquisitionChannels,
  vehicleAcquisitionCommissionTimings,
  vehicleSupplierKinds,
} from "../../../domains/vehicle/ports/vehicleAcquisitionRepository.js";

const nullableText = z.string().trim().min(1).nullable().optional();
const nullableUuid = z.string().trim().uuid().nullable().optional();

export const listVehicleSuppliersQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().trim().min(1).optional(),
});

export const createVehicleSupplierSchema = z.object({
  displayName: z.string().trim().min(1).max(191),
  documentNumber: z.string().trim().min(1).max(32).nullable().optional(),
  email: z.string().trim().email().max(191).nullable().optional(),
  externalProviderId: z.string().trim().min(1).max(191).nullable().optional(),
  kind: z.enum(vehicleSupplierKinds),
  phone: z.string().trim().min(1).max(32).nullable().optional(),
  provider: z.string().trim().min(1).max(80).nullable().optional(),
});

export const updateVehicleSupplierSchema =
  createVehicleSupplierSchema.partial();

export const upsertVehicleUnitAcquisitionSchema = z.object({
  acquisitionDate: z.coerce.date().nullable().optional(),
  acquisitionPriceCents: z.number().int().nonnegative().nullable().optional(),
  acquisitionUserId: nullableUuid,
  channel: z.enum(vehicleAcquisitionChannels),
  commissionTiming: z
    .enum(vehicleAcquisitionCommissionTimings)
    .default("closed"),
  customChannelLabel: z.string().trim().min(1).max(120).nullable().optional(),
  leadId: nullableUuid,
  notes: nullableText,
  supplierId: nullableUuid,
});
