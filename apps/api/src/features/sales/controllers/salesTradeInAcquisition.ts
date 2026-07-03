import { coerceVehicleColor } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { SaleRecord } from "../../../domains/sales/ports/salesRepository.js";
import { attachVehicleUnit } from "../../../domains/vehicle/services/VehicleService/attachVehicleUnit.js";
import {
  createVehicleListing,
  type CreateVehicleListingInput,
} from "../../../domains/vehicle/services/VehicleService/createVehicleListing.js";
import { createVehicleSupplier } from "../../../domains/vehicle/services/VehicleService/manageVehicleSuppliers.js";
import { updateVehicleUnit } from "../../../domains/vehicle/services/VehicleService/updateVehicleUnit.js";
import { upsertVehicleUnitAcquisition } from "../../../domains/vehicle/services/VehicleService/manageVehicleUnitAcquisition.js";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import type { VehicleListingCatalog } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";

type TradeInSnapshot = {
  brand: string | null;
  chassi: string | null;
  color: string | null;
  enabled: boolean;
  model: string | null;
  plate: string | null;
  renavam: string | null;
  valuationCents: number | null;
  yearFabrication: number | null;
  yearModel: number | null;
};

export async function registerTradeInAcquisition(
  context: ServiceContext,
  sale: SaleRecord,
  ports: VehicleInventoryServicePorts,
) {
  if (sale.status !== "closed") return null;
  const tradeIn = readTradeInSnapshot(sale.saleSourceSnapshot.tradeIn);
  if (!tradeIn) return null;

  const listing = await createVehicleListing(
    context,
    listingInputFromTradeIn(tradeIn),
    ports,
  );
  const unit = await attachVehicleUnit(
    context,
    {
      colorName: coerceVehicleColor(tradeIn.color),
      listingId: listing.id,
      plate: tradeIn.plate,
      vin: tradeIn.chassi,
    },
    ports,
  );
  const acquiredUnit = await updateVehicleUnit(
    context,
    { status: "acquired", unitId: unit.id },
    ports,
  );
  const supplier = await createVehicleSupplier(
    context,
    {
      displayName: readString(sale.buyerSnapshot.name) ?? "Cliente da venda",
      documentNumber:
        readString(sale.buyerSnapshot.document) ??
        readString(sale.buyerSnapshot.cpf) ??
        readString(sale.buyerSnapshot.cnpj),
      email: readString(sale.buyerSnapshot.email),
      externalProviderId: sale.leadId,
      kind: "lead",
      phone: readString(sale.buyerSnapshot.phone),
      provider: "sales_trade_in",
    },
    ports,
  );

  await upsertVehicleUnitAcquisition(
    context,
    {
      acquisitionDate: sale.closedAt ?? new Date(),
      acquisitionPriceCents: tradeIn.valuationCents,
      channel: "trade_in_lead",
      commissionTiming: "closed",
      leadId: sale.leadId,
      metadata: { saleId: sale.id },
      notes: `Auto-cadastrado pela venda ${sale.id}.`,
      sourceSnapshot: { saleId: sale.id, tradeIn },
      supplierId: supplier.id,
      unitId: acquiredUnit.id,
    },
    ports,
  );

  return {
    listingId: listing.id,
    supplierId: supplier.id,
    unitId: acquiredUnit.id,
  };
}

function listingInputFromTradeIn(
  tradeIn: TradeInSnapshot,
): CreateVehicleListingInput {
  return {
    catalog: catalogFromTradeIn(tradeIn),
    internalNotes: "Veiculo recebido como troca em formalizacao de venda.",
    manufactureYear: tradeIn.yearFabrication,
    modelYear: tradeIn.yearModel,
    plate: tradeIn.plate,
    priceCents: null,
    status: "in_preparation",
    title: titleFromTradeIn(tradeIn),
    trimName: tradeIn.model,
  };
}

function catalogFromTradeIn(
  tradeIn: TradeInSnapshot,
): VehicleListingCatalog | null {
  if (!tradeIn.brand && !tradeIn.model) return null;
  return {
    brandCode: null,
    brandName: tradeIn.brand,
    fipeCode: null,
    fuel: null,
    modelCode: null,
    modelName: tradeIn.model,
    modelYear: tradeIn.yearModel,
    priceCents: null,
    referenceMonth: null,
    source: null,
    vehicleType: null,
    yearCode: null,
    yearName: tradeIn.yearModel ? String(tradeIn.yearModel) : null,
  };
}

function titleFromTradeIn(tradeIn: TradeInSnapshot): string {
  const title = [tradeIn.brand, tradeIn.model].filter(Boolean).join(" ").trim();
  if (title) return title;
  if (tradeIn.plate) return `Veiculo recebido na troca ${tradeIn.plate}`;
  return "Veiculo recebido na troca";
}

function readTradeInSnapshot(value: unknown): TradeInSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.enabled !== true) return null;
  const tradeIn = {
    brand: readString(record.brand),
    chassi: readString(record.chassi) ?? readString(record.chassis),
    color: readString(record.color),
    enabled: true,
    model: readString(record.model),
    plate: readString(record.plate),
    renavam: readString(record.renavam),
    valuationCents: readCents(record.valuationCents),
    yearFabrication: readInteger(record.yearFabrication),
    yearModel: readInteger(record.yearModel),
  } satisfies TradeInSnapshot;

  if (!tradeIn.brand && !tradeIn.model && !tradeIn.plate && !tradeIn.chassi) {
    return null;
  }
  return tradeIn;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readInteger(value: unknown): number | null {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : null;
  if (!Number.isInteger(numberValue) || Number(numberValue) <= 0) return null;
  return Number(numberValue);
}

function readCents(value: unknown): number | null {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : null;
  if (!Number.isInteger(numberValue) || Number(numberValue) < 0) return null;
  return Number(numberValue);
}
