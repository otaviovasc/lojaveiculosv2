/**
 * Formats Brazilian phone numbers without +55, starting directly with the DDD:
 * Example: "5512997123456" -> "(12) 99712-3456"
 * Example: "12997123456" -> "(12) 99712-3456"
 * Example: "551134567890" -> "(11) 3456-7890"
 * Example: "+55 (12) 99712-3456" -> "(12) 99712-3456"
 */
export function formatCrmPhone(raw?: string | null): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return raw;

  // Remove leading 55 if present (e.g. 5512997123456 or 551134567890)
  if (
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13)
  ) {
    digits = digits.slice(2);
  }

  // Mobile with 9 digits (DD + 9 digits = 11 digits)
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const prefix = digits.slice(2, 7);
    const suffix = digits.slice(7, 11);
    return `(${ddd}) ${prefix}-${suffix}`;
  }

  // Landline with 8 digits (DD + 8 digits = 10 digits)
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const prefix = digits.slice(2, 6);
    const suffix = digits.slice(6, 10);
    return `(${ddd}) ${prefix}-${suffix}`;
  }

  // If 9 digits without DDD
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  // If 8 digits without DDD
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return raw;
}
