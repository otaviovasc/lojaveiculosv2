export function formatBrazilianCnpj(value: string) {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function isValidBrazilianCnpj(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const firstDigit = calculateCnpjDigit(digits.slice(0, 12));
  const secondDigit = calculateCnpjDigit(`${digits.slice(0, 12)}${firstDigit}`);
  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

function calculateCnpjDigit(baseDigits: string) {
  const weights =
    baseDigits.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = baseDigits
    .split("")
    .reduce(
      (total, digit, index) => total + Number(digit) * (weights[index] ?? 0),
      0,
    );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
