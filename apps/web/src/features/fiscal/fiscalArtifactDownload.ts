import type { FiscalArtifactFormat, FiscalDocument } from "./types";

export function isOfficialArtifactDownloadable(document: FiscalDocument) {
  return (
    document.hasProviderReference &&
    ["authorized", "cancelled", "issued"].includes(document.status)
  );
}

export function officialArtifactUnavailableMessage(
  document: FiscalDocument,
  canDownloadOfficialArtifacts: boolean,
) {
  if (!canDownloadOfficialArtifacts) {
    return "Sem permissão para baixar documentos fiscais";
  }
  if (["draft", "processing", "queued"].includes(document.status)) {
    return "Disponível após a autorização do documento fiscal";
  }
  return "O provedor não disponibilizou um arquivo oficial para este documento";
}

export function triggerFiscalArtifactDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const revokeObjectUrl = URL.revokeObjectURL.bind(URL);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => revokeObjectUrl(url), 1_000);
}

export function fiscalArtifactLabel(format: FiscalArtifactFormat) {
  return format === "pdf" ? "PDF oficial" : "XML oficial";
}
