import { isSalePaymentMethod } from "@lojaveiculosv2/shared";
import { assertStoreSalesActor } from "../../../domains/sales/authorization/storeSalesActor.js";
import { assertPermission } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  SalePaymentLine,
  SaleRecord,
} from "../../../domains/sales/ports/salesRepository.js";
import { findReservationSignalPayment } from "../../../domains/sales/salePaymentSignals.js";
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
import type {
  VehicleBuyerSnapshot,
  VehicleSaleBundle,
  VehicleSalePayment,
  VehicleSaleStatus,
} from "../../../domains/vehicle/ports/vehicleSalesRepository.js";
import { registerTradeInAcquisition } from "./salesTradeInAcquisition.js";

export type SalesWorkflowPorts = SalesServicePorts & {
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
  await completeSaleWorkflow(context, {
    buyer,
    listing,
    ports: ports.vehiclePorts,
    reason: input.overrideReason,
    sale: workflowSale,
    selectedDocumentKinds,
    unit,
  });
  await registerTradeInAcquisition(context, sale, ports.vehiclePorts);
}

function toVehicleSaleBundle(
  sale: SaleRecord,
  status: Extract<VehicleSaleStatus, "pending" | "closed">,
): VehicleSaleBundle {
  const salePriceCents = requirePositiveCents(
    sale.salePriceCents,
    "sale_price",
  );

  return {
    payments: sale.payments.map((payment) =>
      toVehicleSalePayment(sale, payment),
    ),
    sale: {
      buyerSnapshot: readBuyerSnapshot(sale.buyerSnapshot),
      closedAt: sale.closedAt,
      createdAt: sale.createdAt,
      id: sale.id,
      salePriceCents,
      sellerUserId: sale.sellerUserId,
      status,
      storeId: sale.storeId,
      tenantId: sale.tenantId,
      unitId: requireWorkflowString(sale.unitId, "vehicle_unit"),
      updatedAt: sale.updatedAt,
    },
  };
}

function toVehicleSalePayment(
  sale: SaleRecord,
  payment: SalePaymentLine,
): VehicleSalePayment {
  if (!isSalePaymentMethod(payment.method)) {
    throw new SaleReadinessError([`payment_method:${payment.id}`]);
  }

  return {
    amountCents: payment.amountCents,
    createdAt: sale.createdAt,
    dueAt: payment.dueAt,
    extraCents: payment.extraCents,
    id: payment.id,
    installments: payment.installments,
    metadata: payment.metadata,
    method: payment.method,
    paidAt: payment.paidAt,
    principalCents: payment.principalCents,
    providerPaymentId: payment.providerPaymentId,
    saleId: sale.id,
    status: payment.status,
    storeId: sale.storeId,
    tenantId: sale.tenantId,
    updatedAt: sale.updatedAt,
  };
}

function readBuyerSnapshot(
  snapshot: Record<string, unknown>,
): VehicleBuyerSnapshot {
  const name = readRequiredString(snapshot.name, "buyer");
  return {
    address: readNullableString(snapshot.address),
    document: readNullableString(snapshot.document),
    email: readNullableString(snapshot.email),
    name,
    phone: readNullableString(snapshot.phone),
  };
}

function requireReservationSignalPayment(
  sale: VehicleSaleBundle,
): VehicleSalePayment {
  const signal = findReservationSignalPayment(sale.payments);
  if (!signal) throw new SaleReadinessError(["reservation_signal_payment"]);
  return signal;
}

function requireWorkflowString(value: string | null, field: string): string {
  if (!value) throw new SaleReadinessError([field]);
  return value;
}

function requirePositiveCents(value: number | null, field: string): number {
  if (!value || value <= 0) throw new SaleReadinessError([field]);
  return value;
}

function readRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new SaleReadinessError([field]);
  const trimmed = value.trim();
  if (!trimmed) throw new SaleReadinessError([field]);
  return trimmed;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
