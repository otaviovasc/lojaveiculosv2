import type {
  CreateVehicleSupplierInput,
  UpdateVehicleSupplierInput,
  UpsertVehicleUnitAcquisitionInput,
  VehicleSupplier,
  VehicleUnitAcquisition,
} from "../model/types";
import {
  createInventoryHeaders,
  inventoryRoutes,
  type ListVehicleSuppliersInput,
} from "./apiRoutes";
import { cleanJson, readJson, type JsonBody } from "./apiClientSupport";

export type InventoryAcquisitionApi = {
  archiveVehicleSupplier: (supplierId: string) => Promise<VehicleSupplier>;
  createVehicleSupplier: (
    input: CreateVehicleSupplierInput,
  ) => Promise<VehicleSupplier>;
  getVehicleUnitAcquisition: (
    listingId: string,
    unitId: string,
  ) => Promise<VehicleUnitAcquisition | null>;
  listVehicleSuppliers: (
    input?: ListVehicleSuppliersInput,
  ) => Promise<readonly VehicleSupplier[]>;
  updateVehicleSupplier: (
    supplierId: string,
    input: UpdateVehicleSupplierInput,
  ) => Promise<VehicleSupplier>;
  upsertVehicleUnitAcquisition: (
    listingId: string,
    unitId: string,
    input: UpsertVehicleUnitAcquisitionInput,
  ) => Promise<VehicleUnitAcquisition>;
};

type CreateInventoryAcquisitionApiOptions = {
  auth: Parameters<typeof createInventoryHeaders>[0];
  baseUrl?: string;
  fetch: typeof fetch;
};

type AcquisitionPayload = { acquisition: VehicleUnitAcquisition | null };
type SuppliersPayload = { suppliers: readonly VehicleSupplier[] };

export function createInventoryAcquisitionApi({
  auth,
  baseUrl,
  fetch,
}: CreateInventoryAcquisitionApiOptions): InventoryAcquisitionApi {
  const sendJson = <T>(route: string, body: JsonBody, method = "POST") =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createInventoryHeaders(auth),
      method,
    }).then(readJson<T>);

  return {
    archiveVehicleSupplier: (supplierId) =>
      fetch(inventoryRoutes.supplier(supplierId, baseUrl), {
        headers: createInventoryHeaders(auth),
        method: "DELETE",
      }).then(readJson<VehicleSupplier>),
    createVehicleSupplier: (input) =>
      sendJson<VehicleSupplier>(inventoryRoutes.suppliers({}, baseUrl), input),
    getVehicleUnitAcquisition: (listingId, unitId) =>
      fetch(inventoryRoutes.unitAcquisition(listingId, unitId, baseUrl), {
        headers: createInventoryHeaders(auth),
      })
        .then(readJson<AcquisitionPayload>)
        .then((payload) => payload.acquisition),
    listVehicleSuppliers: (input = {}) =>
      fetch(inventoryRoutes.suppliers(input, baseUrl), {
        headers: createInventoryHeaders(auth),
      })
        .then(readJson<SuppliersPayload>)
        .then((payload) => payload.suppliers),
    updateVehicleSupplier: (supplierId, input) =>
      sendJson<VehicleSupplier>(
        inventoryRoutes.supplier(supplierId, baseUrl),
        input,
        "PATCH",
      ),
    upsertVehicleUnitAcquisition: (listingId, unitId, input) =>
      sendJson<VehicleUnitAcquisition>(
        inventoryRoutes.unitAcquisition(listingId, unitId, baseUrl),
        input,
        "PUT",
      ),
  };
}
