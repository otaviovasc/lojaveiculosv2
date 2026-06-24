export function recommendedAcquisitionCents(fipePriceCents: number | null) {
  return fipePriceCents === null ? null : Math.round(fipePriceCents * 0.82);
}

export function idealSellPriceCents(fipePriceCents: number | null) {
  return fipePriceCents === null ? null : Math.round(fipePriceCents * 0.97);
}

export function formatCentsForInput(value: number | null) {
  if (value === null) return "";
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value / 100);
}

export function formatCentsCurrency(value: number | null) {
  if (value === null) return "FIPE pendente";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value / 100);
}
