import type { FinanceAutoEntryRepository } from "../../../domains/finance/ports/financeAutoEntryRepository.js";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import { assertStoreSalesActor } from "../../../domains/sales/authorization/storeSalesActor.js";
import { assertPermission } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { SaleRecord } from "../../../domains/sales/ports/salesRepository.js";
import { transitionSale } from "../../../domains/sales/services/SalesService/transitionSale.js";
import {
  SaleReadinessError,
  findScopedSale,
  getSalesRepository,
  requireSaleScope,
  type SalesServicePorts,
} from "../../../domains/sales/services/SalesService/serviceSupport.js";
import { releaseVehicleUnitReservation } from "../../../domains/vehicle/services/VehicleService/releaseVehicleUnitReservation.js";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  findScopedListing,
  findScopedUnitById,
  getFinanceRepository,
  getListingRepository,
  getUnitRepository,
} from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  completeReservationWorkflow,
  completeSaleWorkflow,
} from "../../../domains/vehicle/workflows/vehicleSaleWorkflow.js";
import { parseVehicleSaleDocumentKinds } from "../../../domains/vehicle/documents/vehicleWorkflowDocuments.js";
import {
  assertReservableVehicleState,
  assertSellableVehicleState,
} from "../../../domains/vehicle/workflows/vehicleSaleWorkflowRules.js";
import {
  buildSaleAutoEntryEvents,
  materializeSaleAutoEntryEvents,
} from "./salesAutoEntryEvents.js";
import {
  readBuyerSnapshot,
  requireReservationSignalPayment,
  requireWorkflowString,
  toVehicleSaleBundle,
} from "./salesWorkflowSaleBundle.js";
import { registerTradeInAcquisition } from "./salesTradeInAcquisition.js";

export type SalesWorkflowPorts = SalesServicePorts & {
  crmRepository?: Pick<CrmRepository, "listActivities">;
  financeAutoEntryRepository: FinanceAutoEntryRepository;
  vehiclePorts: VehicleInventoryServicePorts;
};

export type SalesWorkflowTransitionInput = {
  overrideReason?: string | null;
  overrideRequiredFields?: boolean;
  saleId: string;
  status: "pending" | "closed" | "cancelled";
};

export async function transitionSaleWithWorkflow(
  context: ServiceContext,
  input: SalesWorkflowTransitionInput,
  ports: SalesWorkflowPorts,
): Promise<SaleRecord> {
  assertStoreSalesActor(context);
  if (input.status === "cancelled") {
    assertPermission(context, "sale.cancel");
    const current = await findScopedSale(
      getSalesRepository(ports),
      requireSaleScope(context),
      input.saleId,
    );
    if (current.status === "pending" && current.unitId) {
      const pendingSale = toVehicleSaleBundle(current, "pending");
      const unitId = current.unitId;
      return transitionSale(context, input, ports, {
        afterTransition: async () => {
          await releaseVehicleUnitReservation(
            context,
            {
              outcome: "cancel",
              pendingSale,
              reason: input.overrideReason,
              saleId: current.id,
              unitId,
            },
            ports.vehiclePorts,
          );
        },
      });
    }
    return transitionSale(context, input, ports);
  }

  return transitionSale(context, input, ports, {
    afterTransition: (sale) =>
      completeWorkflowForTransition(context, input, sale, ports),
  });
}

async function completeWorkflowForTransition(
  context: ServiceContext,
  input: Exclude<SalesWorkflowTransitionInput, { status: "cancelled" }>,
  sale: SaleRecord,
  ports: SalesWorkflowPorts,
): Promise<void> {
  if (input.status === "cancelled") return;

  const unitId = requireWorkflowString(sale.unitId, "vehicle_unit");
  const unit = await findScopedUnitById(
    context,
    getUnitRepository(ports.vehiclePorts),
    unitId,
  );
  const listing = await findScopedListing(
    context,
    getListingRepository(ports.vehiclePorts),
    unit.listingId,
  );
  const buyer = readBuyerSnapshot(sale.buyerSnapshot);
  const workflowSale = toVehicleSaleBundle(sale, input.status);

  if (input.status === "pending") {
    const signalPayment = requireReservationSignalPayment(workflowSale);
    assertReservableVehicleState(listing, unit);
    await completeReservationWorkflow(context, {
      buyer,
      listing,
      ports: ports.vehiclePorts,
      reason: input.overrideReason,
      sale: workflowSale,
      signalPayment,
      unit,
    });
    return;
  }

  assertSellableVehicleState(listing, unit);
  const selectedDocumentKinds = parseVehicleSaleDocumentKinds(
    sale.selectedDocumentKinds,
  );
  if (!selectedDocumentKinds) {
    throw new SaleReadinessError(["selected_document_kinds"]);
  }
  const autoEntryEvents = buildSaleAutoEntryEvents(sale);
  await completeSaleWorkflow(context, {
    buyer,
    listing,
    ports: ports.vehiclePorts,
    reason: input.overrideReason,
    sale: workflowSale,
    selectedDocumentKinds,
    unit,
  });
  await materializeSaleAutoEntryEvents(context, autoEntryEvents, {
    ...(ports.crmRepository ? { crmRepository: ports.crmRepository } : {}),
    financeAutoEntryRepository: ports.financeAutoEntryRepository,
    financeRepository: getFinanceRepository(ports.vehiclePorts),
  });
  await registerTradeInAcquisition(context, sale, ports.vehiclePorts);
}
