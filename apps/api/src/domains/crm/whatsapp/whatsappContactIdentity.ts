export function shouldBackfillWhatsappPhone(
  currentPhone: string | null | undefined,
  nextPhone: string,
  matchedByChatLid: boolean,
) {
  return (
    matchedByChatLid &&
    isLidLikeWhatsappPhone(currentPhone) &&
    isRealWhatsappPhone(nextPhone)
  );
}

export function isLidLikeWhatsappPhone(value: string | null | undefined) {
  if (!value) return true;
  if (/@lid/i.test(value)) return true;
  const digits = phoneDigits(value);
  return (
    digits.length < 7 ||
    digits.length > 15 ||
    Boolean(digits && /^(\d)\1+$/.test(digits))
  );
}

export function isRealWhatsappPhone(value: string) {
  if (/@lid/i.test(value)) return false;
  const digits = phoneDigits(value);
  return digits.length >= 7 && digits.length <= 15 && !/^(\d)\1+$/.test(digits);
}

function phoneDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}
