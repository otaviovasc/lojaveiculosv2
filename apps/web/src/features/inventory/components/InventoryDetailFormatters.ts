import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import type { InventoryListingDetail } from "../model/types";

export function formatFuelType(
  value: InventoryListingDetail["listing"]["fuelType"],
) {
  if (value === "diesel") return "Diesel";
  if (value === "electric") return "Elétrico";
  if (value === "ethanol") return "Etanol";
  if (value === "flex") return "Flex";
  if (value === "gasoline") return "Gasolina";
  if (value === "hybrid") return "Híbrido";
  if (value === "other") return "Outro";
  return null;
}

export function formatTransmission(
  value: InventoryListingDetail["listing"]["transmission"],
) {
  if (value === "automated") return "Automatizado";
  if (value === "automatic") return "Automático";
  if (value === "cvt") return "CVT";
  if (value === "manual") return "Manual";
  if (value === "other") return "Outro";
  return "Não informado";
}

export function vehicleTypeLabel(
  vehicleType: "cars" | "motorcycles" | "trucks" | null | undefined,
) {
  if (vehicleType === "motorcycles") return "Moto";
  if (vehicleType === "trucks") return "Caminhão";
  return "Carro";
}

export function formatStockAge(createdAt: string) {
  const createdAtMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) return "-";
  const days = Math.max(0, Math.floor((Date.now() - createdAtMs) / 86_400_000));
  if (days === 0) return "Hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

export function statusLabel(
  status: InventoryListingDetail["listing"]["status"],
) {
  const labels: Record<InventoryListingDetail["listing"]["status"], string> = {
    archived: "Arquivado",
    draft: "Rascunho",
    in_preparation: "Preparação",
    published: "Publicado",
    sold_out: "Vendido",
    unpublished: "Fora da vitrine",
  };
  return labels[status] ?? status;
}

export function buildInitialSpecs(
  listing: InventoryListingDetail["listing"],
  primaryUnit: InventoryListingDetail["units"][number] | null,
) {
  return {
    plate: primaryUnit?.plate || listing.plate || "SEM PLACA",
    color: getVehicleColorLabel(primaryUnit?.colorName) || "Não informado",
    km:
      listing.mileageKm !== null
        ? `${listing.mileageKm.toLocaleString("pt-BR")} km`
        : "Não informado",
    fuel:
      formatFuelType(listing.fuelType) ||
      listing.catalog?.fuel ||
      "Não informado",
    transmission: formatTransmission(listing.transmission),
    bodyType: vehicleTypeLabel(listing.catalog?.vehicleType),
    engine: listing.engineDisplacement || "Não informado",
    doors: listing.doors ? `${listing.doors} portas` : "Não informado",
    modality: primaryUnit?.stockNumber
      ? `Estoque ${primaryUnit.stockNumber}`
      : "Estoque",
    vin: primaryUnit?.vin || "Não informado",
  };
}

export function calculateMargin(
  priceCents: number | null,
  acquisitionCost: number,
) {
  if (!priceCents || !acquisitionCost) return "-";
  return `${Math.round(((priceCents - acquisitionCost) / priceCents) * 100)}%`;
}
