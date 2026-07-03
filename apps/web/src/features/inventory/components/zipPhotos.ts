import JSZip from "jszip";
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
  const zip = new JSZip();
  for (let i = 0; i < mediaItems.length; i++) {
    const url = mediaItems[i]?.url;
    if (!url) continue;
    const imgRes = await fetch(url);
    const blob = await imgRes.blob();
    zip.file(`foto_${i + 1}.png`, blob);
  }
  const content = await zip.generateAsync({ type: "blob" });
  const zipUrl = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = zipUrl;
  link.download = `fotos-${item.listing.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.zip`;
  link.click();
  URL.revokeObjectURL(zipUrl);
}
