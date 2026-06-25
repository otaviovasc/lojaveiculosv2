import type {
  CreateVehicleSaleInput,
  VehicleSale,
  VehicleSaleBundle,
  VehicleSalePayment,
  VehicleSalesRepository,
} from "./ports/vehicleSalesRepository.js";

export type TestVehicleSalesRepository = VehicleSalesRepository & {
  payments: VehicleSalePayment[];
  sales: VehicleSale[];
};

export function createTestVehicleSalesRepository(): TestVehicleSalesRepository {
  const payments: VehicleSalePayment[] = [];
  const sales: VehicleSale[] = [];

  return {
    payments,
    sales,
    async create(input: CreateVehicleSaleInput): Promise<VehicleSaleBundle> {
      const now = new Date();
      const sale = createSale(input, sales.length + 1, now);
      sales.push(sale);
      if (!input.payment) return { payment: null, sale };

      const payment: VehicleSalePayment = {
        ...input.payment,
        createdAt: now,
        id: `sale_payment_${payments.length + 1}`,
        saleId: sale.id,
        storeId: sale.storeId,
        tenantId: sale.tenantId,
        updatedAt: now,
      };
      payments.push(payment);
      return { payment, sale };
    },
  };
}

function createSale(
  input: CreateVehicleSaleInput,
  sequence: number,
  now: Date,
): VehicleSale {
  return {
    buyerSnapshot: input.buyerSnapshot,
    closedAt: input.status === "closed" ? now : null,
    createdAt: now,
    id: `sale_${sequence}`,
    listingId: input.listing.id,
    salePriceCents: input.salePriceCents,
    sellerUserId: input.sellerUserId,
    status: input.status,
    storeId: input.unit.storeId ?? "",
    tenantId: input.unit.tenantId ?? "",
    unitId: input.unit.id,
    updatedAt: now,
  };
}
