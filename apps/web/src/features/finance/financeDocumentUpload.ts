import { readUpload } from "./apiJson";
import type { FinanceDocumentUpload } from "./types";

export async function uploadFinanceDocumentObject(
  upload: FinanceDocumentUpload,
  file: File,
  fetchImpl: typeof fetch = fetch,
) {
  if (isLocalMockUploadUrl(upload.uploadUrl)) return;
  await fetchImpl(upload.uploadUrl, {
    body: file,
    method: upload.uploadMethod ?? "PUT",
    ...(upload.uploadHeaders ? { headers: upload.uploadHeaders } : {}),
  }).then(readUpload);
}

function isLocalMockUploadUrl(uploadUrl: string) {
  try {
    const url = new URL(uploadUrl);
    return url.hostname === "upload.local";
  } catch {
    return false;
  }
}
