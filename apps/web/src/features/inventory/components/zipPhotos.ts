import type { InventoryApi } from "../api/apiClient";
import type { InventoryListingSummary } from "../model/types";

export async function downloadAndZipPhotos(
  runtimeApi: InventoryApi,
  item: InventoryListingSummary,
): Promise<void> {
  const details = await runtimeApi.getListing(item.listing.id);
  const mediaItems = details?.media || [];
  if (mediaItems.length === 0) {
    throw new Error("Nenhuma imagem cadastrada para este veículo.");
  }
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  let archivedCount = 0;
  for (let i = 0; i < mediaItems.length; i++) {
    const url = mediaItems[i]?.url;
    if (!url) continue;
    const photo = await fetchZipPhoto(url, i, mediaItems.length);
    zip.file(photo.fileName, photo.blob);
    archivedCount += 1;
  }
  if (!archivedCount) {
    throw new Error("Nenhuma imagem válida foi encontrada para este veículo.");
  }
  const content = await zip.generateAsync({ type: "blob" });
  const zipUrl = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = zipUrl;
  link.download = `fotos-${item.listing.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.zip`;
  link.click();
  URL.revokeObjectURL(zipUrl);
}

export async function fetchZipPhoto(
  url: string,
  index: number,
  total: number,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(
      `Não foi possível baixar a foto ${index + 1} (HTTP ${response.status}).`,
    );
  }
  const blob = await response.blob();
  const mimeType = normalizeImageMimeType(
    response.headers.get("content-type") ?? blob.type,
  );
  if (!mimeType) {
    throw new Error(`A foto ${index + 1} não retornou um arquivo de imagem.`);
  }

  const width = Math.max(2, String(total).length);
  return {
    blob,
    fileName: `foto_${String(index + 1).padStart(width, "0")}.${imageExtension(mimeType)}`,
  };
}

function normalizeImageMimeType(value: string) {
  const mimeType = value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mimeType.startsWith("image/") ? mimeType : null;
}

function imageExtension(mimeType: string) {
  const subtype = mimeType.slice("image/".length);
  if (subtype === "jpeg" || subtype === "pjpeg") return "jpg";
  if (subtype === "svg+xml") return "svg";
  return subtype.replace(/[^a-z0-9]/g, "") || "img";
}
