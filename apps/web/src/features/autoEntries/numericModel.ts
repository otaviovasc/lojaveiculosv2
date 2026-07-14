import { financeAutoEntryMaxRatePpm } from "@lojaveiculosv2/shared";

export function parsePercentageToRatePpm(value: string) {
  const match = /^(\d+)(?:[,.](\d{1,4}))?$/.exec(value.trim());
  if (!match) return null;
  const ratePpm =
    Number(match[1]) * 10_000 + Number((match[2] ?? "").padEnd(4, "0"));
  return Number.isSafeInteger(ratePpm) &&
    ratePpm >= 1 &&
    ratePpm <= financeAutoEntryMaxRatePpm
    ? ratePpm
    : null;
}

export function formatDecimal(value: number, maximumFractionDigits = 2) {
  return Number.isInteger(value)
    ? String(value)
    : value
        .toFixed(maximumFractionDigits)
        .replace(/0+$/, "")
        .replace(/\.$/, "")
        .replace(".", ",");
}
