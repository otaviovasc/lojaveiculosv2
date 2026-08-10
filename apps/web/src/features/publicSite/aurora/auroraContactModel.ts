import type { QuadraStorefrontModel } from "../quadra/quadraAdapter";

const AURORA_WHATSAPP_MESSAGE =
  "Olá! Gostaria de mais informações sobre os veículos disponíveis.";

export function createAuroraWhatsappUrl(value: string) {
  try {
    const url = new URL(value);
    if (!url.searchParams.has("text")) {
      url.searchParams.set("text", AURORA_WHATSAPP_MESSAGE);
    }
    return url.toString();
  } catch {
    return value;
  }
}

export function getAuroraContactPhones(model: QuadraStorefrontModel) {
  const { contact } = model;
  return [
    contact.phone
      ? {
          href:
            (contact.whatsappUrl
              ? createAuroraWhatsappUrl(contact.whatsappUrl)
              : null) ?? `tel:${contact.phone.replace(/\D/g, "")}`,
          label: contact.phoneLabel || "WhatsApp",
          targetBlank: Boolean(contact.whatsappUrl),
          value: formatAuroraPhone(contact.phone),
        }
      : null,
    contact.phone2
      ? {
          href: `tel:${contact.phone2.replace(/\D/g, "")}`,
          label: contact.phone2Label || "Telefone",
          targetBlank: false,
          value: formatAuroraPhone(contact.phone2),
        }
      : null,
    contact.phone3
      ? {
          href: `tel:${contact.phone3.replace(/\D/g, "")}`,
          label: contact.phone3Label || "Comercial",
          targetBlank: false,
          value: formatAuroraPhone(contact.phone3),
        }
      : null,
  ].filter((phone): phone is NonNullable<typeof phone> => phone !== null);
}

export function formatAuroraPhone(number: string) {
  const digits = number.replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return number;
}
