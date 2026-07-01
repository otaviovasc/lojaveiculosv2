export { formatBrazilianCnpj } from "@lojaveiculosv2/shared";

export function formatBrazilianDocument(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatBrazilianPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 13);
  const localDigits = digits.startsWith("55") ? digits.slice(2) : digits;
  if (localDigits.length <= 10) {
    return localDigits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return localDigits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

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
