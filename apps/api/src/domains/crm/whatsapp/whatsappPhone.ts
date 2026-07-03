export function whatsappPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function whatsappPhoneLookupCandidates(value: string) {
  const digits = whatsappPhoneDigits(value);
  const candidates = new Set<string>();
  if (digits) candidates.add(digits);
  if (digits.startsWith("55") && digits.length > 11) {
    candidates.add(digits.slice(2));
  }
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
    candidates.add(`55${digits}`);
  }
  return [...candidates];
}
