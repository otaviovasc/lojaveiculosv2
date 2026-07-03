import { readUpload } from "./apiJson";
import { isLocalMockUploadUrl } from "../../lib/objectUpload";
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
