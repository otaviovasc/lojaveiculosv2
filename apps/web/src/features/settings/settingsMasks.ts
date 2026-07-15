export { formatBrazilianCnpj } from "@lojaveiculosv2/shared";
export { formatBrazilianDocument, formatBrazilianPhone } from "../../lib/masks";

export function formatBrazilianZipCode(value: string) {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d{1,3})$/, "$1-$2");
}

export function normalizePublicSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
