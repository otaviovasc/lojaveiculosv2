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
