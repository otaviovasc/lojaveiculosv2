export function normalizeBrazilianPhoneDigits(value: string): string {
  const digits = onlyDigits(value);
  const hasCountryCode =
    /^\s*\+55/.test(value) || (digits.length > 11 && digits.startsWith("55"));
  return (hasCountryCode ? digits.slice(2) : digits).slice(0, 11);
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
