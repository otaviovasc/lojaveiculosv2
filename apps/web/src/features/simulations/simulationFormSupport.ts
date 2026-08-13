import type { ChangeEvent } from "react";
import { parseCurrencyInput } from "../../lib/masks";

export function createCurrencyChange(setter: (value: number | null) => void) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseCurrencyInput(event.target.value);
    setter(parsed ? Number(parsed) : null);
  };
}

export function toggleBankCode(previous: readonly string[], code: string) {
  return previous.includes(code)
    ? previous.filter((item) => item !== code)
    : [...previous, code];
}
