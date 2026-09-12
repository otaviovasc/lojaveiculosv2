import { formatCurrencyValue } from "../../../lib/masks";

export {
  formatVehicleMileageInput as formatInventoryMileageInput,
  formatVehiclePlateInput as formatInventoryPlateInput,
  formatVehicleRenavamInput as formatInventoryRenavamInput,
  formatVehicleVinInput as formatInventoryVinInput,
} from "../../../lib/masks";

export function formatInventoryCurrencyInput(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!normalized || normalized === "-") return "";
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0
    ? formatCurrencyValue(amount)
    : "";
}

export function normalizeInventoryCurrencyEntry(value: string) {
  const normalized = value.replace(/[^\d,]/g, "");
  const [whole = "", ...decimalParts] = normalized.split(",");
  const wholeDigits = whole.slice(0, 12);
  const groupedWhole = wholeDigits
    ? Number(wholeDigits).toLocaleString("pt-BR")
    : "";
  if (!normalized.includes(",")) return groupedWhole;
  return `${groupedWhole || "0"},${decimalParts.join("").slice(0, 2)}`;
}
