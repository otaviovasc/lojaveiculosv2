import { createDocumentsApi } from "../documents/apiClient";
import { createDocumentsApiOptions } from "../documents/runtimeApi";
import type { WorkspaceDocument } from "../documents/types";

export type StoredDocumentDownload = {
  blob: Blob;
  fileName: string;
};

export type StoredDocumentsZip = StoredDocumentDownload & {
  count: number;
  failedCount: number;
};

export async function downloadStoredDocument(
  document: WorkspaceDocument,
): Promise<StoredDocumentDownload> {
  const api = createDocumentsApi(await createDocumentsApiOptions());
  return fetchStoredDocument(api, document);
}

export async function buildStoredDocumentsZip(
  documents: readonly WorkspaceDocument[],
  fileName: string,
): Promise<StoredDocumentsZip | null> {
  const [{ default: JSZip }, options] = await Promise.all([
    import("jszip"),
    createDocumentsApiOptions(),
  ]);
  const api = createDocumentsApi(options);
  const zip = new JSZip();
  const usedFileNames = new Set<string>();
  let count = 0;
  let failedCount = 0;

  for (const document of documents) {
    try {
      const stored = await fetchStoredDocument(api, document);
      zip.file(uniqueZipFileName(stored.fileName, usedFileNames), stored.blob);
      count++;
    } catch {
      failedCount++;
    }
  }

  if (count === 0) return null;
  return {
    blob: await zip.generateAsync({ type: "blob" }),
    count,
    failedCount,
    fileName,
  };
}

function uniqueZipFileName(
  fileName: string,
  usedFileNames: Set<string>,
): string {
  const extensionIndex = fileName.lastIndexOf(".");
  const hasExtension = extensionIndex > 0;
  const baseName = hasExtension ? fileName.slice(0, extensionIndex) : fileName;
  const extension = hasExtension ? fileName.slice(extensionIndex) : "";
  let candidate = fileName;
  let copyNumber = 2;

  while (usedFileNames.has(candidate.toLocaleLowerCase())) {
    candidate = `${baseName} (${copyNumber})${extension}`;
    copyNumber++;
  }
  usedFileNames.add(candidate.toLocaleLowerCase());
  return candidate;
}

export function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function fetchStoredDocument(
  api: ReturnType<typeof createDocumentsApi>,
  document: WorkspaceDocument,
): Promise<StoredDocumentDownload> {
  const download = await api.downloadDocument(document.id);
  const url = download.contentUrl ?? download.downloadUrl;
  const response = await fetch(url, {
    headers: download.contentHeaders ?? {},
  });
  if (!response.ok) throw new Error("document_content_unavailable");
  return {
    blob: await response.blob(),
    fileName: download.fileName || document.file.fileName,
  };
}
