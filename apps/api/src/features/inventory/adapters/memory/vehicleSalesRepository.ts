import type {
  CreateVehicleSaleInput,
  VehicleSale,
  VehicleSaleBundle,
  VehicleSalePayment,
  VehicleSalesRepository,
} from "../../../../domains/vehicle/ports/vehicleSalesRepository.js";

export function createMemoryVehicleSalesRepository(): VehicleSalesRepository {
  let paymentSequence = 1;
  let saleSequence = 1;

  return {
    async create(input: CreateVehicleSaleInput): Promise<VehicleSaleBundle> {
      const now = new Date();
      const sale: VehicleSale = {
        buyerSnapshot: input.buyerSnapshot,
        closedAt: input.status === "closed" ? now : null,
        createdAt: now,
        id: `sale_${saleSequence}`,
        listingId: input.listing.id,
        salePriceCents: input.salePriceCents,
        sellerUserId: input.sellerUserId,
        status: input.status,
        storeId: input.unit.storeId ?? "",
        tenantId: input.unit.tenantId ?? "",
        unitId: input.unit.id,
        updatedAt: now,
      };
      saleSequence += 1;
      if (!input.payment) return { payment: null, sale };
      const payment: VehicleSalePayment = {
        ...input.payment,
        createdAt: now,
        id: `sale_payment_${paymentSequence}`,
        saleId: sale.id,
        storeId: sale.storeId,
        tenantId: sale.tenantId,
        updatedAt: now,
      };
      paymentSequence += 1;

      return { payment, sale };
    },
  };
}
