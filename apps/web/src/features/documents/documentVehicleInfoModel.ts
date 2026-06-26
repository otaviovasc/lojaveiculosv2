import { targetLabel } from "./documentLabels";
import {
  readMetadataRecord,
  readMetadataString,
  readRecord,
  readRecordString,
} from "./documentMetadataReaders";
import type { DocumentLinkTarget, WorkspaceDocument } from "./types";

export type DocumentVehicleInfo = {
  id: string;
  label: string;
  listingId: string | null;
  plate: string | null;
  primaryMediaUrl: string | null;
  stockNumber: string | null;
  targetType: "vehicle_unit";
  unitId: string | null;
  vin: string | null;
};

export type DocumentVehicleOption = DocumentVehicleInfo;

const VEHICLE_MEDIA_KEYS = [
  "primaryMediaUrl",
  "primaryImageUrl",
  "mediaUrl",
  "imageUrl",
  "thumbnailUrl",
] as const;
const VEHICLE_RECORD_MEDIA_KEYS = [
  "primaryMediaUrl",
  "primaryImageUrl",
  "mediaUrl",
  "imageUrl",
] as const;
const VEHICLE_TARGET_TYPES = ["vehicle_unit"] as const;

export function documentVehicleInfo(
  document: WorkspaceDocument,
): DocumentVehicleInfo | null {
  const targetType = document.context.targetType;
  if (!isVehicleDocumentTargetType(targetType)) return null;

  const vehicle = readMetadataRecord(document, "vehicle");
  const catalog = readRecord(vehicle?.catalog);
  const catalogLabel = [
    readRecordString(catalog, ["brandName"]),
    readRecordString(catalog, ["modelName"]),
  ]
    .filter(Boolean)
    .join(" ");
  const explicitLabel =
    readMetadataString(document, [
      "unitTitle",
      "unitLabel",
      "vehicleTitle",
      "vehicleLabel",
    ]) ?? readRecordString(vehicle, ["title", "label"]);
  const label =
    explicitLabel ?? (catalogLabel || targetLabel(document.context.targetType));
  const unitId =
    readMetadataString(document, ["unitId", "vehicleUnitId"]) ??
    readRecordString(vehicle, ["unitId"]);
  const listingId =
    readMetadataString(document, ["listingId", "vehicleListingId"]) ??
    readRecordString(vehicle, ["listingId"]);

  return {
    id:
      unitId ??
      readRecordString(vehicle, ["id", "listingId"]) ??
      document.context.targetId,
    label,
    listingId,
    plate:
      readMetadataString(document, ["plate", "licensePlate"]) ??
      readRecordString(vehicle, ["plate", "licensePlate"]),
    primaryMediaUrl:
      readMetadataString(document, VEHICLE_MEDIA_KEYS) ??
      readRecordString(vehicle, VEHICLE_RECORD_MEDIA_KEYS),
    stockNumber:
      readMetadataString(document, ["stockNumber"]) ??
      readRecordString(vehicle, ["stockNumber"]),
    targetType,
    unitId: unitId ?? document.context.targetId,
    vin:
      readMetadataString(document, ["vin", "chassis", "chassi"]) ??
      readRecordString(vehicle, ["vin", "chassis", "chassi"]),
  };
}

function isVehicleLinkedDocument(document: WorkspaceDocument) {
  return isVehicleDocumentTargetType(document.context.targetType);
}

export function isVehicleDocumentTargetType(
  targetType: DocumentLinkTarget,
): targetType is DocumentVehicleInfo["targetType"] {
  return (VEHICLE_TARGET_TYPES as readonly string[]).includes(targetType);
}
