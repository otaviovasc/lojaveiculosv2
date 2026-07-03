import type { CrmWhatsappMessage } from "./crmWhatsappTypes";

export function formatSentPreview(message: CrmWhatsappMessage) {
  if (message.type === "IMAGE") return `Eu: ${message.content || "Imagem"}`;
  if (message.type === "AUDIO") return "Eu: Audio";
  if (message.type === "VIDEO") return `Eu: ${message.content || "Video"}`;
  if (message.type === "DOCUMENT")
    return `Eu: ${message.content || "Documento"}`;
  if (message.type === "LOCATION")
    return `Eu: ${message.content || "Localizacao"}`;
  if (message.type === "CATALOG") return `Eu: ${message.content || "Catalogo"}`;
  return `Eu: ${message.content}`;
}
