import {
  getVehicleEngineAspirationLabel,
  type VehicleEngineAspiration,
  type VehicleEngineDisplacement,
} from "@lojaveiculosv2/shared";

export function splitVehicleTitle(title: string) {
  const parts = title.trim().split(/\s+/);
  if (parts.length > 1) {
    return {
      brand: parts[0],
      restTitle: parts.slice(1).join(" "),
    };
  }
  return {
    brand: title,
    restTitle: "",
  };
}

export function formatPublicVehiclePrice(priceCents: number | null) {
  if (priceCents === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(priceCents / 100);
}

export function formatPublicVehicleMileage(mileageKm: number | null) {
  if (mileageKm === null) return "-";
  return `${new Intl.NumberFormat("pt-BR").format(mileageKm)} km`;
}

export function formatPublicVehicleFuel(value: string | null) {
  const labels: Record<string, string> = {
    diesel: "Diesel",
    electric: "Eletrico",
    ethanol: "Etanol",
    flex: "Flex",
    gasoline: "Gasolina",
    hybrid: "Hibrido",
    other: "Outro",
  };
  return value ? (labels[value] ?? value) : "-";
}

export function formatPublicVehicleTransmission(value: string | null) {
  const labels: Record<string, string> = {
    automated: "Automatizado",
    automatic: "Automatico",
    cvt: "CVT",
    manual: "Manual",
    other: "Outro",
  };
  return value ? (labels[value] ?? value) : "-";
}

export function formatPublicVehicleEngine({
  aspiration,
  displacement,
}: {
  aspiration: VehicleEngineAspiration | null;
  displacement: VehicleEngineDisplacement | null;
}) {
  const aspirationLabel = aspiration
    ? getVehicleEngineAspirationLabel(aspiration)
    : null;
  return [displacement, aspirationLabel].filter(Boolean).join(" ") || "-";
}
