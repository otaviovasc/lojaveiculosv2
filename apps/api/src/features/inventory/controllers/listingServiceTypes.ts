import type { AttachVehicleUnitInput } from "../../../domains/vehicle/services/VehicleService/attachVehicleUnit.js";
import type { CreateVehicleListingInput } from "../../../domains/vehicle/services/VehicleService/createVehicleListing.js";

type ExplicitOptionalUndefined<T> = {
  [Key in keyof T]: Record<string, never> extends Pick<T, Key>
    ? T[Key] | undefined
    : T[Key];
};

export type AttachListingInput =
  ExplicitOptionalUndefined<AttachVehicleUnitInput>;
export type CreateListingInput =
  ExplicitOptionalUndefined<CreateVehicleListingInput>;

export type VehicleMediaResult = {
  mediaId: string;
  storageKey: string;
  status: "created";
  unitId: string;
  url: string;
};
