import type { Context, Hono } from "hono";
import type { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  VehicleSupplier,
  VehicleUnitAcquisition,
} from "../../../domains/vehicle/ports/vehicleAcquisitionRepository.js";
import type { InventoryListingServices } from "./listingServices.js";
import {
  handle,
  parseJson,
  RequestValidationError,
} from "./vehicle.controller.http.js";
import {
  createVehicleSupplierSchema,
  listVehicleSuppliersQuerySchema,
  updateVehicleSupplierSchema,
  upsertVehicleUnitAcquisitionSchema,
} from "./vehicle.acquisition.schemas.js";

type UpdateSupplierBody = z.infer<typeof updateVehicleSupplierSchema>;

type CreateContext = (context: Context) => Promise<ServiceContext>;

export function registerInventoryAcquisitionRoutes(
  app: Hono,
  services: InventoryListingServices,
  createContext: CreateContext,
) {
  app.get("/suppliers", async (context) =>
    handle(context, async () => {
      const parsed = listVehicleSuppliersQuerySchema.safeParse(
        context.req.query(),
      );
      if (!parsed.success) {
        throw new RequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      const suppliers = await services.listVehicleSuppliers(
        serviceContext,
        parsed.data,
      );
      return context.json({ suppliers: suppliers.map(toSupplierDto) });
    }),
  );

  app.post("/suppliers", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, createVehicleSupplierSchema);
      const serviceContext = await createContext(context);
      const supplier = await services.createVehicleSupplier(
        serviceContext,
        input,
      );
      return context.json(toSupplierDto(supplier), 201);
    }),
  );

  app.patch("/suppliers/:supplierId", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, updateVehicleSupplierSchema);
      const serviceContext = await createContext(context);
      const supplier = await services.updateVehicleSupplier(serviceContext, {
        ...cleanUpdateSupplierInput(input),
        supplierId: routeParam(context, "supplierId"),
      });
      return context.json(toSupplierDto(supplier));
    }),
  );

  app.delete("/suppliers/:supplierId", async (context) =>
    handle(context, async () => {
      const serviceContext = await createContext(context);
      const supplier = await services.archiveVehicleSupplier(serviceContext, {
        supplierId: routeParam(context, "supplierId"),
      });
      return context.json(toSupplierDto(supplier));
    }),
  );

  app.get("/listings/:listingId/units/:unitId/acquisition", async (context) =>
    handle(context, async () => {
      const serviceContext = await createContext(context);
      const acquisition = await services.getVehicleUnitAcquisition(
        serviceContext,
        routeVehicleUnit(context),
      );
      return context.json({
        acquisition: acquisition ? toAcquisitionDto(acquisition) : null,
      });
    }),
  );

  app.put("/listings/:listingId/units/:unitId/acquisition", async (context) =>
    handle(context, async () => {
      const input = await parseJson(
        context,
        upsertVehicleUnitAcquisitionSchema,
      );
      const serviceContext = await createContext(context);
      const acquisition = await services.upsertVehicleUnitAcquisition(
        serviceContext,
        { ...routeVehicleUnit(context), ...input },
      );
      return context.json(toAcquisitionDto(acquisition));
    }),
  );
}

function routeVehicleUnit(context: Context) {
  return {
    listingId: routeParam(context, "listingId"),
    unitId: routeParam(context, "unitId"),
  };
}

function routeParam(context: Context, name: string) {
  const value = context.req.param(name);
  if (!value)
    throw new RequestValidationError(`Route parameter missing: ${name}.`);
  return value;
}

function cleanUpdateSupplierInput(input: UpdateSupplierBody) {
  return {
    ...(input.displayName !== undefined
      ? { displayName: input.displayName }
      : {}),
    ...(input.documentNumber !== undefined
      ? { documentNumber: input.documentNumber }
      : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.externalProviderId !== undefined
      ? { externalProviderId: input.externalProviderId }
      : {}),
    ...(input.kind !== undefined ? { kind: input.kind } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.provider !== undefined ? { provider: input.provider } : {}),
  };
}

function toSupplierDto(supplier: VehicleSupplier) {
  return {
    ...supplier,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}

function toAcquisitionDto(acquisition: VehicleUnitAcquisition) {
  return {
    ...acquisition,
    acquisitionDate: acquisition.acquisitionDate?.toISOString() ?? null,
    createdAt: acquisition.createdAt.toISOString(),
    updatedAt: acquisition.updatedAt.toISOString(),
  };
}
