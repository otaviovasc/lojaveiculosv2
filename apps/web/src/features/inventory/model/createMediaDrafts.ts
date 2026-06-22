import type { InventoryMediaKind } from "./types";

export const createMediaLimits = {
  maxPhotos: 12,
  maxVideos: 1,
  maxSizeBytes: 25 * 1024 * 1024,
} as const;

export type CreateMediaDraft = {
  altText: string;
  displayOrder: number;
  file: File;
  id: string;
  kind: InventoryMediaKind;
  previewUrl: string | null;
};

export type CreateMediaReject = {
  fileName: string;
  reason: string;
};

export function buildCreateMediaDrafts({
  current,
  files,
  previewUrl,
}: {
  current: readonly CreateMediaDraft[];
  files: readonly File[];
  previewUrl?: (file: File) => string | null;
}) {
  const accepted = [...current];
  const rejected: CreateMediaReject[] = [];
  let photoCount = accepted.filter((item) => item.kind === "photo").length;
  let videoCount = accepted.filter((item) => item.kind === "video").length;

  for (const file of files) {
    const kind = inferMediaKind(file);

    if (file.size > createMediaLimits.maxSizeBytes) {
      rejected.push({
        fileName: file.name,
        reason: "Arquivo acima de 25 MB.",
      });
      continue;
    }

    if (kind === "photo" && photoCount >= createMediaLimits.maxPhotos) {
      rejected.push({
        fileName: file.name,
        reason: "Limite de 12 fotos atingido.",
      });
      continue;
    }

    if (kind === "video" && videoCount >= createMediaLimits.maxVideos) {
      rejected.push({
        fileName: file.name,
        reason: "Apenas um video por anuncio.",
      });
      continue;
    }

    accepted.push({
      altText: file.name,
      displayOrder: accepted.length,
      file,
      id: createDraftId(file, accepted.length),
      kind,
      previewUrl: previewUrl?.(file) ?? null,
    });

    if (kind === "photo") photoCount += 1;
    if (kind === "video") videoCount += 1;
  }

  return { accepted: normalizeDraftOrder(accepted), rejected };
}

export function moveCreateMediaDraft(
  items: readonly CreateMediaDraft[],
  index: number,
  direction: -1 | 1,
) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return normalizeDraftOrder(items);

  const next = [...items];
  const currentItem = next[index];
  const targetItem = next[target];
  if (!currentItem || !targetItem) return normalizeDraftOrder(items);

  next[index] = targetItem;
  next[target] = currentItem;
  return normalizeDraftOrder(next);
}

export function removeCreateMediaDraft(
  items: readonly CreateMediaDraft[],
  id: string,
) {
  return normalizeDraftOrder(items.filter((item) => item.id !== id));
}

export function normalizeDraftOrder(items: readonly CreateMediaDraft[]) {
  return items.map((item, displayOrder) => ({ ...item, displayOrder }));
}

function inferMediaKind(file: File): InventoryMediaKind {
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "document_preview";
  return "photo";
}

function createDraftId(file: File, index: number) {
  return [
    file.name,
    file.size,
    file.lastModified,
    index,
    Math.random().toString(36).slice(2, 8),
  ].join("-");
}
