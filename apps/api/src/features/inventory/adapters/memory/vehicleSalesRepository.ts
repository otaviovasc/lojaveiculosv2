import type {
  CreateVehicleSaleInput,
  VehicleSale,
  VehicleSaleBundle,
  VehicleSalePayment,
  VehicleSalesRepository,
} from "../../../../domains/vehicle/ports/vehicleSalesRepository.js";

export function createMemoryVehicleSalesRepository(): VehicleSalesRepository {
  const sales = new Map<string, VehicleSaleBundle>();
  let paymentSequence = 1;
  let saleSequence = 1;

  return {
    async cancelPending(input): Promise<VehicleSaleBundle> {
      const current = sales.get(input.saleId);
      if (
        !current ||
        current.sale.status !== "pending" ||
        current.sale.storeId !== input.storeId ||
        current.sale.tenantId !== input.tenantId
      ) {
        throw new Error(`Pending sale not found: ${input.saleId}`);
      }
      const now = new Date();
      const bundle: VehicleSaleBundle = {
        payments: current.payments.map((payment) =>
          payment.status === "pending"
            ? { ...payment, status: "cancelled", updatedAt: now }
            : payment,
        ),
        sale: { ...current.sale, status: "cancelled", updatedAt: now },
      };
      sales.set(bundle.sale.id, bundle);
      return bundle;
    },
    async create(input: CreateVehicleSaleInput): Promise<VehicleSaleBundle> {
      const now = new Date();
      const sale: VehicleSale = {
        buyerSnapshot: input.buyerSnapshot,
        closedAt: input.status === "closed" ? now : null,
        createdAt: now,
        id: `sale_${saleSequence}`,
        salePriceCents: input.salePriceCents,
        sellerUserId: input.sellerUserId,
        status: input.status,
        storeId: input.unit.storeId ?? "",
        tenantId: input.unit.tenantId ?? "",
        unitId: input.unit.id,
        updatedAt: now,
      };
      saleSequence += 1;
      const payments = input.payments.map((payment): VehicleSalePayment => {
        const saved = {
          ...payment,
          createdAt: now,
          id: `sale_payment_${paymentSequence}`,
          saleId: sale.id,
          storeId: sale.storeId,
          tenantId: sale.tenantId,
          updatedAt: now,
        };
        paymentSequence += 1;
        return saved;
      });

      const bundle = { payments, sale };
      sales.set(sale.id, bundle);
      return bundle;
    },
    async findPendingByUnit(input): Promise<VehicleSaleBundle | null> {
      const matches = [...sales.values()].filter(
        (bundle) =>
          bundle.sale.unitId === input.unitId &&
          bundle.sale.storeId === input.storeId &&
          bundle.sale.tenantId === input.tenantId &&
          bundle.sale.status === "pending",
      );
      if (matches.length > 1) {
        throw new Error(
          `Multiple pending sales found for vehicle unit: ${input.unitId}`,
        );
      }
      return matches[0] ?? null;
    },
  };
}
