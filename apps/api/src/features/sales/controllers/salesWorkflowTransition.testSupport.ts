import type { AuditSink } from "@lojaveiculosv2/audit";
import { expect } from "vitest";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import type { CrmSaleOutcomePort } from "../../../domains/sales/ports/crmSaleOutcomePort.js";
import {
  createTestFinanceAutoEntryRepository,
  type TestFinanceAutoEntryRepository,
} from "../../../domains/finance/testSupportFinanceAutoEntryRepository.js";
import type { VehicleSaleDocumentKind } from "../../../domains/vehicle/documents/vehicleWorkflowDocuments.js";
import type { VehicleUnit } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import {
  createInMemoryVehiclePorts,
  createListing,
  type TestVehicleInventoryPorts,
} from "../../../domains/vehicle/services/VehicleService/testSupport.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import type { SalesRepository } from "../../../domains/sales/ports/salesRepository.js";
import { createSalesServices, type SalesServices } from "./salesServices.js";

const storeId = "store_1";
const tenantId = "tenant_1";
const minimalSaleDocumentKinds = [
  "sale_contract",
] as const satisfies readonly VehicleSaleDocumentKind[];

interface CompleteDraftOptions {
  selectedDocumentKinds?: readonly VehicleSaleDocumentKind[];
}

export function createHarness(
  status: "available" | "reserved",
  salesRepository: SalesRepository = createMemorySalesRepository(),
  crmRepository?: Pick<CrmRepository, "listActivities">,
  crmSaleOutcomePort: CrmSaleOutcomePort | null = noopCrmSaleOutcomePort,
): {
  financeAutoEntryRepository: TestFinanceAutoEntryRepository;
  services: SalesServices;
  vehiclePorts: TestVehicleInventoryPorts;
} {
  const vehiclePorts = createInMemoryVehiclePorts([
    createListing({
      priceCents: 5000000,
      status: "published",
      storeId,
      tenantId,
      unitIds: ["unit_1"],
    }),
  ]);
  vehiclePorts.units.set("unit_1", createUnit(status));
  const financeAutoEntryRepository = createTestFinanceAutoEntryRepository();
  const services = createSalesServices({
    ...(crmSaleOutcomePort ? { crmSaleOutcomePort } : {}),
    ...(crmRepository ? { crmRepository } : {}),
    financeAutoEntryRepository,
    ports: { salesRepository },
    workflowPorts: vehiclePorts,
  });
  return { financeAutoEntryRepository, services, vehiclePorts };
}

const noopCrmSaleOutcomePort: CrmSaleOutcomePort = {
  applyWon: async () => undefined,
};

export function completeDraft({
  selectedDocumentKinds = minimalSaleDocumentKinds,
}: CompleteDraftOptions = {}) {
  return {
    buyerSnapshot: {
      address: "Rua Um, 100",
      document: "000.000.000-00",
      email: "buyer@example.com",
      name: "Maria",
      phone: "(11) 99999-0000",
    },
    documentPolicySnapshot: {},
    leadId: "lead_1",
    salePriceCents: 5000000,
    selectedDocumentKinds: [...selectedDocumentKinds],
    sellerUserId: "seller_1",
    unitId: "unit_1",
  };
}

export function context(permissions: string[], audit?: AuditSink) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    ...(audit ? { audit } : {}),
    entitlements: ["sales"],
    permissions,
    request: { requestId: "req_1" },
    storeId,
    tenantId,
  });
}

export function expectFinanceLinkedToSale(
  vehiclePorts: TestVehicleInventoryPorts,
  saleId: string,
) {
  expect(
    vehiclePorts.financeRepository.links.some(
      (link) => link.targetId === saleId && link.targetType === "sale",
    ),
  ).toBe(true);
}

function createUnit(status: "available" | "reserved"): VehicleUnit {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    colorName: null,
    createdAt: now,
    id: "unit_1",
    listingId: "listing_1",
    plate: "ABC1D23",
    status,
    stockNumber: null,
    storeId,
    tenantId,
    updatedAt: now,
    vin: null,
  };
}
