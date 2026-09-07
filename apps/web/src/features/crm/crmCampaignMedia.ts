import { readFileAsBase64 } from "./crmMediaFiles";

export const CAMPAIGN_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CAMPAIGN_IMAGE_CAPTION_MAX_LENGTH = 1000;
export const CAMPAIGN_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif";

const CAMPAIGN_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function normalizeCampaignImageMimeType(type: string) {
  const normalized = type.trim().toLowerCase();
  return normalized === "image/jpg" ? "image/jpeg" : normalized;
}

export function validateCampaignImage(file: File): string | null {
  if (file.size > CAMPAIGN_IMAGE_MAX_BYTES) {
    return "A imagem deve ter no máximo 10 MB.";
  }
  if (
    !CAMPAIGN_IMAGE_MIME_TYPES.has(normalizeCampaignImageMimeType(file.type))
  ) {
    return "Tipo de imagem não suportado. Escolha JPEG, PNG, WebP ou GIF.";
  }
  return null;
}

export function readCampaignImageAsBase64(file: File) {
  return readFileAsBase64(file);
}

export function validateCampaignImageCaption(
  text: string,
  recipients: readonly { name: string }[],
): string | null {
  const template = text.trim();
  if (template.length > CAMPAIGN_IMAGE_CAPTION_MAX_LENGTH) {
    return "A legenda da imagem deve ter no máximo 1000 caracteres após a personalização.";
  }

  const oversizedRecipient = recipients.findIndex((recipient) => {
    const rendered = renderCampaignImageCaption(
      template,
      recipient.name.trim() || "cliente",
    );
    return rendered.length > CAMPAIGN_IMAGE_CAPTION_MAX_LENGTH;
  });
  if (oversizedRecipient < 0) return null;
  return `A legenda da imagem para o destinatário ${oversizedRecipient + 1} excede 1000 caracteres após a personalização.`;
}

export function renderCampaignImageCaption(template: string, name: string) {
  return template.replace(
    /\{\{\s*([\w.-]+)\s*\}\}|\{\s*([\w.-]+)\s*\}/g,
    (_, firstKey, secondKey) => {
      const key = String(firstKey ?? secondKey);
      return key === "nome" ? name : "";
    },
  );
}
