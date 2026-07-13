import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import type {
  FinanceEntryBundle,
  FinanceRepository,
} from "../../finance/ports/financeRepository.js";
import type { VehicleCost } from "../ports/vehicleOperationsRepository.js";
import type {
  VehicleListing,
  VehicleUnit,
} from "../ports/vehicleInventoryRepository.js";
import type {
  VehicleSaleBundle,
  VehicleSalePayment,
} from "../ports/vehicleSalesRepository.js";

export async function createReservationFinanceEntry(input: {
  financeRepository: FinanceRepository;
  listing: VehicleListing;
  sale: VehicleSaleBundle;
  sellerUserId: string | null;
  signalPayment: VehicleSalePayment;
  unit: VehicleUnit;
}): Promise<FinanceEntryBundle> {
  const payment = input.signalPayment;
  return input.financeRepository.createEntry({
    amountCents: payment.amountCents,
    category: "vehicle_reservation_signal",
    dueAt: payment.dueAt,
    links: salePaymentLinks(input.sale, payment, input.unit),
    metadata: paymentMetadata(payment, "vehicle_reservation"),
    name: `Sinal de reserva - ${input.listing.title}`,
    paidAt: payment.paidAt,
    sellerUserId: input.sellerUserId,
    status: financeStatus(payment),
    storeId: input.sale.sale.storeId,
    tenantId: input.sale.sale.tenantId,
    type: "revenue",
  });
}

export async function createSaleFinanceEntries(input: {
  financeRepository: FinanceRepository;
  listing: VehicleListing;
  sale: VehicleSaleBundle;
  sellerUserId: string | null;
  unit: VehicleUnit;
}): Promise<readonly FinanceEntryBundle[]> {
  const activePayments = input.sale.payments.filter((payment) =>
    isActiveSalePaymentStatus(payment.status),
  );
  return Promise.all(
    activePayments.map((payment) => upsertSaleFinanceEntry(input, payment)),
  );
}

export async function createVehicleCostFinanceEntry(input: {
  cost: VehicleCost;
  financeRepository: FinanceRepository;
  listing: VehicleListing;
}): Promise<FinanceEntryBundle> {
  return input.financeRepository.createEntry({
    amountCents: input.cost.amountCents,
    category: `vehicle_${input.cost.kind}`,
    dueAt: input.cost.costDate,
    links: [
      { targetId: input.cost.id, targetType: "vehicle_cost" },
      { targetId: input.cost.unitId, targetType: "vehicle_unit" },
    ],
    metadata: {
      description: input.cost.description,
      kind: input.cost.kind,
      source: "vehicle_cost",
    },
    name: `Custo de veiculo - ${input.listing.title}`,
    paidAt: input.cost.costDate,
    sellerUserId: null,
    status: "paid",
    storeId: input.cost.storeId ?? "",
    tenantId: input.cost.tenantId ?? "",
    type: "expense",
  });
}

async function upsertSaleFinanceEntry(
  input: {
    financeRepository: FinanceRepository;
    listing: VehicleListing;
    sale: VehicleSaleBundle;
    sellerUserId: string | null;
    unit: VehicleUnit;
  },
  payment: VehicleSalePayment,
): Promise<FinanceEntryBundle> {
  const existing = await input.financeRepository.list({
    limit: 20,
    offset: 0,
    storeId: input.sale.sale.storeId,
    targetId: payment.id,
    targetType: "sale_payment",
    tenantId: input.sale.sale.tenantId,
  });
  const reservationEntry = existing.find(
    (bundle) =>
      bundle.entry.category === "vehicle_reservation_signal" ||
      bundle.entry.metadata.source === "vehicle_reservation",
  );
  const entry = {
    amountCents: payment.amountCents,
    category: "vehicle_sale",
    dueAt: payment.dueAt,
    links: salePaymentLinks(input.sale, payment, input.unit),
    metadata: paymentMetadata(payment, "vehicle_sale"),
    name: `Venda de veiculo - ${input.listing.title}`,
    paidAt: payment.paidAt,
    sellerUserId: input.sellerUserId,
    status: financeStatus(payment),
    storeId: input.sale.sale.storeId,
    tenantId: input.sale.sale.tenantId,
    type: "revenue" as const,
  };
  if (!reservationEntry) {
    return input.financeRepository.createEntry(entry);
  }
  return input.financeRepository.updateEntry({
    ...entry,
    entryId: reservationEntry.entry.id,
  });
}

function salePaymentLinks(
  sale: VehicleSaleBundle,
  payment: VehicleSalePayment,
  unit: VehicleUnit,
) {
  return [
    { targetId: sale.sale.id, targetType: "sale" as const },
    { targetId: payment.id, targetType: "sale_payment" as const },
    { targetId: unit.id, targetType: "vehicle_unit" as const },
  ];
}

function financeStatus(payment: VehicleSalePayment): "paid" | "pending" {
  return payment.status === "paid" ? "paid" : "pending";
}

function paymentMetadata(
  payment: VehicleSalePayment,
  source: "vehicle_reservation" | "vehicle_sale",
) {
  return {
    extraCents: payment.extraCents,
    installments: payment.installments,
    method: payment.method,
    principalCents: payment.principalCents,
    salePaymentStatus: payment.status,
    source,
  };
}
