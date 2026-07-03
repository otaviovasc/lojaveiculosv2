export type ObjectUploadDescriptor = {
  uploadHeaders?: Record<string, string>;
  uploadMethod?: string;
  uploadUrl: string;
};

export type UploadObjectOptions = {
  failureMessage?: string;
  fetch?: typeof fetch;
};

export async function uploadObjectToStorage(
  upload: ObjectUploadDescriptor,
  body: BodyInit,
  options: UploadObjectOptions = {},
) {
  if (isLocalMockUploadUrl(upload.uploadUrl)) return;

  const failureMessage =
    options.failureMessage ??
    "Nao foi possivel enviar o arquivo para o armazenamento.";
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(upload.uploadUrl, {
      body,
      ...(upload.uploadHeaders ? { headers: upload.uploadHeaders } : {}),
      method: upload.uploadMethod ?? "PUT",
    });
  } catch {
    throw new Error(
      `${failureMessage} Verifique a politica de CORS do bucket R2 para PUT e Content-Type.`,
    );
  }

  if (!response.ok) {
    throw new Error(`${failureMessage} Codigo HTTP ${response.status}.`);
  }
}

export function isLocalMockUploadUrl(uploadUrl: string) {
  try {
    const url = new URL(uploadUrl);
    return url.hostname === "upload.local";
  } catch {
    return false;
  }
}
