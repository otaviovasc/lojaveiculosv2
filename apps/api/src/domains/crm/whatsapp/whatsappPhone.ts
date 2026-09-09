export function whatsappPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function whatsappPhoneLookupCandidates(value: string) {
  const digits = whatsappPhoneDigits(value);
  if (!digits) return [];
  const candidates = new Set<string>([digits]);
  const national =
    digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
      ? digits.slice(2)
      : digits;
  const nationalVariants = new Set([national]);
  if (national.length === 11 && national[2] === "9") {
    nationalVariants.add(national.slice(0, 2) + national.slice(3));
  }
  if (national.length === 10 && /^[6-9]$/u.test(national[2] ?? "")) {
    nationalVariants.add(`${national.slice(0, 2)}9${national.slice(2)}`);
  }
  for (const variant of nationalVariants) {
    if (variant.length === 10 || variant.length === 11) {
      candidates.add(variant);
      candidates.add(`55${variant}`);
    }
  }
  return [...candidates];
}

export function whatsappPhonesMatch(a: string, b: string) {
  return whatsappPhoneLookupCandidates(a).includes(whatsappPhoneDigits(b));
}
