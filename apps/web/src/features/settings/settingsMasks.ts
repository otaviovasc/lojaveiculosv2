export { formatBrazilianCnpj } from "@lojaveiculosv2/shared";
export {
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatBrazilianZipCode,
} from "../../lib/masks";

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
