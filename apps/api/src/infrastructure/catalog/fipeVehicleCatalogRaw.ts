import type { VehicleCatalogType } from "../../domains/vehicle/ports/vehicleCatalogProvider.js";

export type FipeRawResponseCapture = {
  brandCode: string | null;
  endpoint: string;
  fipeCode: string | null;
  fetchedAt: Date;
  httpStatus: number;
  modelCode: string | null;
  payload: unknown;
  provider: "fipe";
  referenceCode: string | null;
  requestKey: string;
  requestPath: string;
  vehicleType: VehicleCatalogType | null;
  yearCode: string | null;
};

export type FipeRawResponseRecorder = (
  input: FipeRawResponseCapture,
) => Promise<void>;

const vehicleTypes = new Set(["cars", "motorcycles", "trucks"]);

export function createFipeRawResponseCapture(input: {
  path: string;
  payload: unknown;
  status: number;
}): FipeRawResponseCapture {
  const metadata = parsePathMetadata(input.path);
  return {
    ...metadata,
    fetchedAt: new Date(),
    httpStatus: input.status,
    payload: input.payload,
    provider: "fipe",
    requestKey: input.path,
    requestPath: input.path,
  };
}

function parsePathMetadata(path: string) {
  const [pathname, query] = path.split("?");
  const params = new URLSearchParams(query ?? "");
  const referenceCode = params.get("reference");
  const parts = (pathname ?? "").split("/").filter(Boolean);
  const vehicleType = readVehicleType(parts[0]);

  if (parts[0] === "references") {
    return emptyMetadata("references", referenceCode);
  }
  if (!vehicleType) return emptyMetadata("unknown", referenceCode);

  if (parts[1] === "brands") {
    return parseBrandPath(parts, vehicleType, referenceCode);
  }

  return parseFipeCodePath(parts, vehicleType, referenceCode);
}

function parseBrandPath(
  parts: string[],
  vehicleType: VehicleCatalogType,
  referenceCode: string | null,
) {
  if (parts.length === 2) {
    return metadata("brands", vehicleType, referenceCode);
  }
  const brandCode = parts[2] ?? null;
  if (parts.length === 4) {
    return metadata("models", vehicleType, referenceCode, { brandCode });
  }
  const modelCode = parts[4] ?? null;
  if (parts.length === 6) {
    return metadata("years", vehicleType, referenceCode, {
      brandCode,
      modelCode,
    });
  }
  return metadata("vehicle_detail", vehicleType, referenceCode, {
    brandCode,
    modelCode,
    yearCode: parts[6] ?? null,
  });
}

function parseFipeCodePath(
  parts: string[],
  vehicleType: VehicleCatalogType,
  referenceCode: string | null,
) {
  const fipeCode = parts[1] ?? null;
  if (parts.length === 3) {
    return metadata("fipe_code_years", vehicleType, referenceCode, {
      fipeCode,
    });
  }
  return metadata(
    parts[4] === "history" ? "fipe_code_history" : "fipe_code_detail",
    vehicleType,
    referenceCode,
    { fipeCode, yearCode: parts[3] ?? null },
  );
}

function metadata(
  endpoint: string,
  vehicleType: VehicleCatalogType | null,
  referenceCode: string | null,
  values: Partial<
    Pick<
      FipeRawResponseCapture,
      "brandCode" | "fipeCode" | "modelCode" | "yearCode"
    >
  > = {},
) {
  return {
    brandCode: values.brandCode ?? null,
    endpoint,
    fipeCode: values.fipeCode ?? null,
    modelCode: values.modelCode ?? null,
    referenceCode,
    vehicleType,
    yearCode: values.yearCode ?? null,
  };
}

function emptyMetadata(endpoint: string, referenceCode: string | null) {
  return metadata(endpoint, null, referenceCode);
}

function readVehicleType(value: string | undefined): VehicleCatalogType | null {
  return vehicleTypes.has(value ?? "") ? (value as VehicleCatalogType) : null;
}
