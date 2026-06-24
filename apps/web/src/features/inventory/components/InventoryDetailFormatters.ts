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
