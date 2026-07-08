import type { CrmWhatsappSendMediaInput } from "../../domains/crm/ports/crmWhatsappGateway.js";

export function createZapiMediaEndpoint(input: CrmWhatsappSendMediaInput) {
  if (input.mediaType === "document") {
    return `/send-document/${documentExtension(input.fileName)}`;
  }
  return `/send-${input.mediaType}`;
}

export function createZapiMediaBody(
  input: CrmWhatsappSendMediaInput,
): Record<string, unknown> {
  const common = {
    phone: input.phone,
    ...(input.caption ? { caption: input.caption } : {}),
  };
  if (input.mediaType === "image") {
    return { ...common, image: input.mediaUrl };
  }
  if (input.mediaType === "audio") {
    return {
      phone: input.phone,
      ...(input.asyncProcessing === undefined
        ? {}
        : { async: input.asyncProcessing }),
      audio: input.mediaUrl,
    };
  }
  if (input.mediaType === "video") {
    return {
      ...common,
      ...(input.asyncProcessing === undefined
        ? {}
        : { async: input.asyncProcessing }),
      video: input.mediaUrl,
    };
  }
  return {
    ...common,
    document: input.mediaUrl,
    fileName: input.fileName ?? "documento.pdf",
  };
}

function documentExtension(fileName?: string) {
  const extension = fileName?.split(".").pop()?.trim().toLowerCase();
  return extension && /^[a-z0-9]{1,12}$/.test(extension) ? extension : "pdf";
}
