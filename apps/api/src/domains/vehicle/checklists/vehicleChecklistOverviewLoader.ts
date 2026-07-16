import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { VehicleChecklist } from "../ports/vehicleChecklistRepository.js";
import type {
  VehicleListing,
  VehicleUnit,
  VehicleUnitStatus,
} from "../ports/vehicleInventoryRepository.js";
import type {
  VehicleChecklistOverview,
  VehicleChecklistOverviewFilter,
  VehicleChecklistOverviewScope,
} from "../readModels/vehicleChecklistOverview.js";
import {
  getChecklistRepository,
  getListingRepository,
  getUnitRepository,
  type VehicleInventoryServicePorts,
} from "../services/VehicleService/serviceSupport.js";
import {
  compareOverviewItems,
  createOverviewItem,
  overviewStatusMatches,
  summarizeOverview,
} from "./vehicleChecklistOverviewModel.js";

const pageSize = 500;
const activeStatuses: readonly VehicleUnitStatus[] = [
  "acquired",
  "available",
  "in_preparation",
  "reserved",
];
const completedStatuses: readonly VehicleUnitStatus[] = ["delivered", "sold"];

export type VehicleChecklistOverviewInput = {
  scope?: VehicleChecklistOverviewScope | undefined;
  search?: string | null | undefined;
  status?: VehicleChecklistOverviewFilter | undefined;
  unitId?: string | undefined;
};

export async function loadVehicleChecklistOverview(
  context: ServiceContext,
  input: VehicleChecklistOverviewInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleChecklistOverview> {
  const [listings, units] = await Promise.all([
    listAllListings(context, ports),
    listAllUnits(context, ports),
  ]);
  const listingsById = new Map(
    listings.map((listing) => [listing.id, listing]),
  );
  const scopedUnits = units.filter((unit) =>
    unitMatchesInput(unit, listingsById.get(unit.listingId), input),
  );
  const checklists = await listChecklists(context, scopedUnits, ports);
  const checklistsByUnitId = groupChecklists(checklists);
  const items = scopedUnits.flatMap((unit) => {
    const listing = listingsById.get(unit.listingId);
    if (!listing) return [];
    const item = createOverviewItem(
      listing,
      unit,
      checklistsByUnitId.get(unit.id) ?? [],
    );
    return overviewStatusMatches(item.status, input.status ?? "all")
      ? [item]
      : [];
  });
  items.sort(compareOverviewItems);

  return {
    generatedAt: new Date(),
    items,
    summary: summarizeOverview(items),
  };
}

async function listAllListings(
  context: ServiceContext,
  ports: VehicleInventoryServicePorts | undefined,
) {
  const repository = getListingRepository(ports);
  const records: VehicleListing[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await repository.list({
      limit: pageSize,
      offset,
      search: null,
      status: null,
      storeId: context.storeId,
      tenantId: context.tenantId,
    });
    records.push(...page);
    if (page.length < pageSize) return records;
  }
}

async function listAllUnits(
  context: ServiceContext,
  ports: VehicleInventoryServicePorts | undefined,
) {
  const repository = getUnitRepository(ports);
  const records: VehicleUnit[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await repository.list({
      limit: pageSize,
      offset,
      status: null,
      storeId: context.storeId,
      tenantId: context.tenantId,
    });
    records.push(...page);
    if (page.length < pageSize) return records;
  }
}

async function listChecklists(
  context: ServiceContext,
  units: readonly VehicleUnit[],
  ports: VehicleInventoryServicePorts | undefined,
) {
  const repository = getChecklistRepository(ports);
  const records: VehicleChecklist[] = [];
  for (let index = 0; index < units.length; index += pageSize) {
    records.push(
      ...(await repository.listByUnitIds({
        storeId: context.storeId,
        tenantId: context.tenantId,
        unitIds: units.slice(index, index + pageSize).map((unit) => unit.id),
      })),
    );
  }
  return records;
}

function groupChecklists(checklists: readonly VehicleChecklist[]) {
  const groups = new Map<string, VehicleChecklist[]>();
  for (const checklist of checklists) {
    const group = groups.get(checklist.unitId) ?? [];
    group.push(checklist);
    groups.set(checklist.unitId, group);
  }
  return groups;
}

function unitMatchesInput(
  unit: VehicleUnit,
  listing: VehicleListing | undefined,
  input: VehicleChecklistOverviewInput,
) {
  if (!listing || (input.unitId && unit.id !== input.unitId)) return false;
  const statuses =
    input.unitId || input.scope === "all"
      ? null
      : input.scope === "completed"
        ? completedStatuses
        : activeStatuses;
  if (statuses && !statuses.includes(unit.status)) return false;
  const search = input.search?.trim().toLocaleLowerCase("pt-BR");
  if (!search) return true;
  return [listing.title, unit.plate, unit.stockNumber, unit.vin, unit.colorName]
    .filter(Boolean)
    .some((value) => value?.toLocaleLowerCase("pt-BR").includes(search));
}
