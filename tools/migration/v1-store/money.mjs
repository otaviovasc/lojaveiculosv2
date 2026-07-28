const POSTGRES_INTEGER_MAX = 2_147_483_647n;
const POSTGRES_INTEGER_MIN = -2_147_483_648n;

export function decimalToCents(value, label = "billing amount") {
  const text = String(value ?? "").trim();
  const match = /^([+-]?)(\d+)(?:\.(\d*))?$/.exec(text);
  if (!match) throw new Error(`Invalid V1 ${label}: ${value}`);

  const [, sign, whole, fraction = ""] = match;
  const centDigits = fraction.padEnd(2, "0").slice(0, 2);
  let cents = BigInt(whole) * 100n + BigInt(centDigits);
  if ((fraction[2] ?? "0") >= "5") cents += 1n;
  if (sign === "-") cents = -cents;

  if (cents < POSTGRES_INTEGER_MIN || cents > POSTGRES_INTEGER_MAX) {
    throw new Error(`V1 ${label} is outside the V2 integer range: ${value}`);
  }
  return Number(cents);
}
