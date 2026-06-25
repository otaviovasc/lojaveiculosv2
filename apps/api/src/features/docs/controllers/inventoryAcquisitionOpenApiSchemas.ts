import { objectSchema } from "./inventoryOpenApiSchemaParts.js";

const supplierKindEnum = [
  "lead",
  "person",
  "company",
  "provider",
  "partner",
  "auction",
  "other",
] as const;

const acquisitionChannelEnum = [
  "trade_in_lead",
  "direct_person",
  "supplier_company",
  "auto_avaliar",
  "repasse_partner",
  "auction",
  "consignment",
  "marketplace",
  "other",
] as const;

const commissionTimingEnum = ["acquisition", "reserve", "closed"] as const;

export const inventoryAcquisitionSchemas = {
  CreateVehicleSupplierRequest: objectSchema(["displayName", "kind"], {
    displayName: { type: "string", minLength: 1, maxLength: 191 },
    documentNumber: { type: ["string", "null"], minLength: 1, maxLength: 32 },
    email: { type: ["string", "null"], format: "email", maxLength: 191 },
    externalProviderId: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 191,
    },
    kind: { $ref: "#/components/schemas/VehicleSupplierKind" },
    phone: { type: ["string", "null"], minLength: 1, maxLength: 32 },
    provider: { type: ["string", "null"], minLength: 1, maxLength: 80 },
  }),
  UpdateVehicleSupplierRequest: objectSchema([], {
    displayName: { type: "string", minLength: 1, maxLength: 191 },
    documentNumber: { type: ["string", "null"], minLength: 1, maxLength: 32 },
    email: { type: ["string", "null"], format: "email", maxLength: 191 },
    externalProviderId: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 191,
    },
    kind: { $ref: "#/components/schemas/VehicleSupplierKind" },
    phone: { type: ["string", "null"], minLength: 1, maxLength: 32 },
    provider: { type: ["string", "null"], minLength: 1, maxLength: 80 },
  }),
  UpsertVehicleUnitAcquisitionRequest: objectSchema(["channel"], {
    acquisitionDate: { type: ["string", "null"], format: "date-time" },
    acquisitionPriceCents: { type: ["integer", "null"], minimum: 0 },
    acquisitionUserId: { type: ["string", "null"], format: "uuid" },
    channel: { $ref: "#/components/schemas/VehicleAcquisitionChannel" },
    commissionTiming: {
      $ref: "#/components/schemas/VehicleAcquisitionCommissionTiming",
      default: "closed",
    },
    customChannelLabel: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 120,
    },
    leadId: { type: ["string", "null"], format: "uuid" },
    notes: { type: ["string", "null"], minLength: 1 },
    supplierId: { type: ["string", "null"], format: "uuid" },
  }),
  VehicleAcquisitionChannel: {
    type: "string",
    enum: acquisitionChannelEnum,
  },
  VehicleAcquisitionCommissionTiming: {
    type: "string",
    enum: commissionTimingEnum,
  },
  VehicleSupplier: objectSchema(["displayName", "id", "kind"], {
    createdAt: { type: "string", format: "date-time" },
    displayName: { type: "string" },
    documentNumber: { type: ["string", "null"] },
    email: { type: ["string", "null"] },
    externalProviderId: { type: ["string", "null"] },
    id: { type: "string" },
    kind: { $ref: "#/components/schemas/VehicleSupplierKind" },
    metadata: { type: "object", additionalProperties: true },
    phone: { type: ["string", "null"] },
    provider: { type: ["string", "null"] },
    updatedAt: { type: "string", format: "date-time" },
  }),
  VehicleSupplierKind: {
    type: "string",
    enum: supplierKindEnum,
  },
  VehicleSuppliersResponse: objectSchema(["suppliers"], {
    suppliers: {
      type: "array",
      items: { $ref: "#/components/schemas/VehicleSupplier" },
    },
  }),
  VehicleUnitAcquisition: objectSchema(["channel", "id", "unitId"], {
    acquisitionDate: { type: ["string", "null"], format: "date-time" },
    acquisitionPriceCents: { type: ["integer", "null"], minimum: 0 },
    acquisitionUserId: { type: ["string", "null"] },
    channel: { $ref: "#/components/schemas/VehicleAcquisitionChannel" },
    commissionTiming: {
      $ref: "#/components/schemas/VehicleAcquisitionCommissionTiming",
    },
    customChannelLabel: { type: ["string", "null"] },
    id: { type: "string" },
    leadId: { type: ["string", "null"] },
    notes: { type: ["string", "null"] },
    sourceSnapshot: { type: "object", additionalProperties: true },
    supplierId: { type: ["string", "null"] },
    unitId: { type: "string" },
  }),
  VehicleUnitAcquisitionResponse: objectSchema(["acquisition"], {
    acquisition: {
      anyOf: [
        { $ref: "#/components/schemas/VehicleUnitAcquisition" },
        { type: "null" },
      ],
    },
  }),
} as const;
