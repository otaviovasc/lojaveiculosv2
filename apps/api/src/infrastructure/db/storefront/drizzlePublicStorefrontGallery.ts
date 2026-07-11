import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { vehicleMedia, vehicleUnits } from "@lojaveiculosv2/db";
import type {
  PublicVehicleMedia,
  PublicVehicleMediaGroup,
} from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import type {
  DrizzlePublicStorefrontClient,
  MediaRow,
  UnitRow,
} from "./drizzlePublicStorefrontQueryTypes.js";

export async function findListingGallery(
  db: DrizzlePublicStorefrontClient,
  input: { listingId: string; storeId: string; tenantId: string },
): Promise<{
  defaultMedia: readonly PublicVehicleMedia[];
  heroMedia: PublicVehicleMedia | null;
  mediaGroups: readonly PublicVehicleMediaGroup[];
  thumbnailUrl: string | null;
}> {
  const units = await findListingUnits(db, input);
  const media = await findUnitsMedia(db, units, input);
  const mediaGroups = units.map((unit) => ({
    colorName: unit.colorName,
    media: media.filter((item) => item.unitId === unit.id),
    unitId: unit.id,
  }));
  const defaultMedia =
    mediaGroups.find((group) => group.media.length > 0)?.media ?? [];

  return {
    defaultMedia,
    heroMedia: selectHeroMedia(defaultMedia, media),
    mediaGroups,
    thumbnailUrl: firstPhotoUrl(defaultMedia) ?? firstPhotoUrl(media),
  };
}

async function findListingUnits(
  db: DrizzlePublicStorefrontClient,
  input: { listingId: string; storeId: string; tenantId: string },
): Promise<readonly UnitRow[]> {
  const rows = await db
    .select({
      colorName: vehicleUnits.colorName,
      id: vehicleUnits.id,
      status: vehicleUnits.status,
      stockNumber: vehicleUnits.stockNumber,
    })
    .from(vehicleUnits)
    .where(
      and(
        eq(vehicleUnits.listingId, input.listingId),
        eq(vehicleUnits.storeId, input.storeId),
        eq(vehicleUnits.tenantId, input.tenantId),
        eq(vehicleUnits.isDeleted, false),
        isNull(vehicleUnits.deletedAt),
      ),
    )
    .orderBy(asc(vehicleUnits.id))
    .limit(100);

  return [...rows].sort(comparePublicUnits);
}

async function findUnitsMedia(
  db: DrizzlePublicStorefrontClient,
  units: readonly UnitRow[],
  input: { storeId: string; tenantId: string },
): Promise<readonly PublicVehicleMedia[]> {
  if (units.length === 0) return [];
  const unitIds = units.map((unit) => unit.id);
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const unitOrder = new Map(unitIds.map((unitId, index) => [unitId, index]));
  const rows = await db
    .select({
      altText: vehicleMedia.altText,
      displayOrder: vehicleMedia.displayOrder,
      kind: vehicleMedia.kind,
      unitId: vehicleMedia.unitId,
      url: vehicleMedia.url,
    })
    .from(vehicleMedia)
    .where(
      and(
        inArray(vehicleMedia.unitId, unitIds),
        eq(vehicleMedia.storeId, input.storeId),
        eq(vehicleMedia.tenantId, input.tenantId),
        eq(vehicleMedia.isPublic, true),
        eq(vehicleMedia.isDeleted, false),
        isNull(vehicleMedia.deletedAt),
      ),
    )
    .orderBy(asc(vehicleMedia.displayOrder))
    .limit(48);

  return [...rows]
    .sort((left, right) => {
      const leftUnitOrder =
        unitOrder.get(left.unitId) ?? Number.MAX_SAFE_INTEGER;
      const rightUnitOrder =
        unitOrder.get(right.unitId) ?? Number.MAX_SAFE_INTEGER;
      if (leftUnitOrder !== rightUnitOrder) {
        return leftUnitOrder - rightUnitOrder;
      }
      return left.displayOrder - right.displayOrder;
    })
    .map((row) => toPublicVehicleMedia(row, unitById.get(row.unitId)));
}

function firstPhotoUrl(media: readonly PublicVehicleMedia[]) {
  return media.find((item) => item.kind === "photo")?.url ?? null;
}

function selectHeroMedia(
  defaultMedia: readonly PublicVehicleMedia[],
  media: readonly PublicVehicleMedia[],
) {
  return (
    defaultMedia.find((item) => item.kind === "video") ??
    media.find((item) => item.kind === "video") ??
    defaultMedia.find((item) => item.kind === "photo") ??
    media.find((item) => item.kind === "photo") ??
    null
  );
}

function comparePublicUnits(left: UnitRow, right: UnitRow) {
  const statusDifference =
    unitStatusPriority(left.status) - unitStatusPriority(right.status);
  if (statusDifference !== 0) return statusDifference;

  const colorDifference = compareText(left.colorName, right.colorName);
  if (colorDifference !== 0) return colorDifference;
  const stockDifference = compareText(left.stockNumber, right.stockNumber);
  if (stockDifference !== 0) return stockDifference;
  return left.id.localeCompare(right.id);
}

function unitStatusPriority(status: UnitRow["status"]) {
  const priority: Record<UnitRow["status"], number> = {
    available: 0,
    in_preparation: 1,
    acquired: 2,
    reserved: 3,
    sold: 4,
    delivered: 5,
    inactive: 6,
  };
  return priority[status] ?? 99;
}

function compareText(left: string | null, right: string | null) {
  return (left ?? "").localeCompare(right ?? "");
}

function toPublicVehicleMedia(
  row: MediaRow,
  unit: UnitRow | undefined,
): PublicVehicleMedia {
  return {
    altText: row.altText,
    displayOrder: row.displayOrder,
    kind: row.kind,
    unitColorName: unit?.colorName ?? null,
    unitId: row.unitId,
    url: row.url,
  };
}
