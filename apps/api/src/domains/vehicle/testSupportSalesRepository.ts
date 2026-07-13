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
    async cancelPending(input): Promise<VehicleSaleBundle> {
      const sale = sales.find(
        (item) =>
          item.id === input.saleId &&
          item.status === "pending" &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (!sale) throw new Error(`Pending sale not found: ${input.saleId}`);
      const now = new Date();
      const updatedSale: VehicleSale = {
        ...sale,
        status: "cancelled",
        updatedAt: now,
      };
      sales.splice(sales.indexOf(sale), 1, updatedSale);
      const updatedPayments = payments
        .filter((item) => item.saleId === input.saleId)
        .map((payment) =>
          payment.status === "pending"
            ? ({ ...payment, status: "cancelled", updatedAt: now } as const)
            : payment,
        );
      for (const updatedPayment of updatedPayments) {
        const index = payments.findIndex(
          (item) => item.id === updatedPayment.id,
        );
        payments.splice(index, 1, updatedPayment);
      }
      return { payments: updatedPayments, sale: updatedSale };
    },
    payments,
    sales,
    async create(input: CreateVehicleSaleInput): Promise<VehicleSaleBundle> {
      const now = new Date();
      const sale = createSale(input, sales.length + 1, now);
      sales.push(sale);
      const createdPayments = input.payments.map(
        (payment, index): VehicleSalePayment => ({
          ...payment,
          createdAt: now,
          id: `sale_payment_${payments.length + index + 1}`,
          saleId: sale.id,
          storeId: sale.storeId,
          tenantId: sale.tenantId,
          updatedAt: now,
        }),
      );
      payments.push(...createdPayments);
      return { payments: createdPayments, sale };
    },
    async findPendingByUnit(input): Promise<VehicleSaleBundle | null> {
      const matches = sales.filter(
        (item) =>
          item.unitId === input.unitId &&
          item.status === "pending" &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (matches.length > 1) {
        throw new Error(
          `Multiple pending sales found for vehicle unit: ${input.unitId}`,
        );
      }
      const [sale] = matches;
      if (!sale) return null;
      return {
        payments: payments.filter((item) => item.saleId === sale.id),
        sale,
      };
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
    salePriceCents: input.salePriceCents,
    sellerUserId: input.sellerUserId,
    status: input.status,
    storeId: input.unit.storeId ?? "",
    tenantId: input.unit.tenantId ?? "",
    unitId: input.unit.id,
    updatedAt: now,
  };
}
