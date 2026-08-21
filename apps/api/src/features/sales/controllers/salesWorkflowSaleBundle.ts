import { isSalePaymentMethod } from "@lojaveiculosv2/shared";
import type {
  SalePaymentLine,
  SaleRecord,
} from "../../../domains/sales/ports/salesRepository.js";
import { findReservationSignalPayment } from "../../../domains/sales/salePaymentSignals.js";
import { SaleReadinessError } from "../../../domains/sales/services/SalesService/serviceSupport.js";
import type {
  VehicleBuyerSnapshot,
  VehicleSaleBundle,
  VehicleSalePayment,
  VehicleSaleStatus,
} from "../../../domains/vehicle/ports/vehicleSalesRepository.js";

export function toVehicleSaleBundle(
  sale: SaleRecord,
  status: Extract<VehicleSaleStatus, "pending" | "closed">,
): VehicleSaleBundle {
  return {
    payments: sale.payments.map((payment) =>
      toVehicleSalePayment(sale, payment),
    ),
    sale: {
      buyerSnapshot: readBuyerSnapshot(sale.buyerSnapshot),
      closedAt: sale.closedAt,
      createdAt: sale.createdAt,
      id: sale.id,
      salePriceCents: requirePositiveCents(sale.salePriceCents, "sale_price"),
      saleSourceSnapshot: sale.saleSourceSnapshot,
      sellerUserId: sale.sellerUserId,
      status,
      storeId: sale.storeId,
      tenantId: sale.tenantId,
      unitId: requireWorkflowString(sale.unitId, "vehicle_unit"),
      updatedAt: sale.updatedAt,
    },
  };
}

export function readBuyerSnapshot(
  snapshot: Record<string, unknown>,
): VehicleBuyerSnapshot {
  return {
    address: readNullableString(snapshot.address),
    cep: readNullableString(
      snapshot.cep ?? snapshot.zipCode ?? snapshot.postalCode,
    ),
    city: readNullableString(snapshot.city ?? snapshot.cidade),
    district: readNullableString(snapshot.district ?? snapshot.bairro),
    document: readNullableString(snapshot.document ?? snapshot.cpf),
    email: readNullableString(snapshot.email),
    maritalStatus: readNullableString(
      snapshot.maritalStatus ?? snapshot.estadoCivil,
    ),
    name: readRequiredString(snapshot.name, "buyer"),
    nationality: readNullableString(
      snapshot.nationality ?? snapshot.nacionalidade,
    ),
    phone: readNullableString(snapshot.phone),
    phone2: readNullableString(snapshot.phone2),
    phone3: readNullableString(snapshot.phone3),
    profession: readNullableString(snapshot.profession ?? snapshot.profissao),
    state: readNullableString(snapshot.state ?? snapshot.uf ?? snapshot.estado),
  };
}

export function requireReservationSignalPayment(
  sale: VehicleSaleBundle,
): VehicleSalePayment {
  const signal = findReservationSignalPayment(sale.payments);
  if (!signal) throw new SaleReadinessError(["reservation_signal_payment"]);
  return signal;
}

export function requireWorkflowString(
  value: string | null,
  field: string,
): string {
  if (!value) throw new SaleReadinessError([field]);
  return value;
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
