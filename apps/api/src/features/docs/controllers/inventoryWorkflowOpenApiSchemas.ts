import { objectSchema } from "./inventoryOpenApiSchemaParts.js";

export const inventoryWorkflowSchemas = {
  InventoryBuyer: objectSchema(["name"], {
    address: { type: ["string", "null"], minLength: 1 },
    document: { type: ["string", "null"], minLength: 1 },
    email: { type: ["string", "null"], format: "email" },
    name: { type: "string", minLength: 1 },
    phone: { type: ["string", "null"], minLength: 1 },
  }),
  ReserveVehicleListingRequest: objectSchema(["buyer", "signalAmountCents"], {
    buyer: { $ref: "#/components/schemas/InventoryBuyer" },
    paymentMethod: { type: "string", minLength: 1, default: "pix" },
    reason: { type: ["string", "null"], minLength: 1 },
    salePriceCents: { type: ["integer", "null"], minimum: 1 },
    signalAmountCents: { type: "integer", minimum: 1 },
    unitId: { type: "string", minLength: 1 },
  }),
  ReleaseVehicleReservationRequest: objectSchema([], {
    reason: { type: ["string", "null"], minLength: 1 },
    saleId: { type: ["string", "null"], minLength: 1 },
  }),
  SellVehicleListingRequest: objectSchema(["buyer"], {
    buyer: { $ref: "#/components/schemas/InventoryBuyer" },
    paidAmountCents: { type: ["integer", "null"], minimum: 1 },
    paymentMethod: { type: "string", minLength: 1, default: "pix" },
    reason: { type: ["string", "null"], minLength: 1 },
    salePriceCents: { type: ["integer", "null"], minimum: 1 },
    unitId: { type: "string", minLength: 1 },
  }),
} as const;
