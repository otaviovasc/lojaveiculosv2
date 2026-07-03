import type {
  StorefrontMediaAsset,
  StorefrontMediaUpload,
} from "@lojaveiculosv2/shared";
import { readApiJson } from "../../lib/apiErrors";
import type { SettingsAuth } from "../settings/types";

export type StorefrontMediaUploadPayload = {
  blob: Blob;
  fileName: string;
  height: number;
  width: number;
};

export type StorefrontMediaApi = {
  listAssets: () => Promise<readonly StorefrontMediaAsset[]>;
  uploadImage: (
    input: StorefrontMediaUploadPayload,
  ) => Promise<StorefrontMediaAsset>;
};

export type CreateStorefrontMediaApiOptions = {
  auth?: SettingsAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createStorefrontMediaApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateStorefrontMediaApiOptions): StorefrontMediaApi {
  return {
    listAssets: () =>
      fetch(storefrontMediaRoutes.media(baseUrl), {
        headers: createHeaders(auth),
      })
        .then(readJson<{ assets: readonly StorefrontMediaAsset[] }>)
        .then((data) => data.assets),
    uploadImage: async (input) => {
      const upload = await requestUpload(
        { auth, fetch, ...(baseUrl ? { baseUrl } : {}) },
        input,
      );
      await fetch(upload.uploadUrl, {
        body: input.blob,
        headers: upload.uploadHeaders,
        method: upload.uploadMethod,
      }).then(readUploadResponse);
      return upload.asset;
    },
  };
}

export const storefrontMediaRoutes = {
  media: (baseUrl?: string) => createEndpoint("/storefront/media", baseUrl),
  uploads: (baseUrl?: string) =>
    createEndpoint("/storefront/media/uploads", baseUrl),
} as const;

async function requestUpload(
  options: CreateStorefrontMediaApiOptions,
  input: StorefrontMediaUploadPayload,
) {
  return options
    .fetch(storefrontMediaRoutes.uploads(options.baseUrl), {
      body: JSON.stringify({
        contentType: input.blob.type || "image/png",
        fileName: input.fileName,
        height: input.height,
        sizeBytes: input.blob.size,
        width: input.width,
      }),
      headers: createHeaders(options.auth ?? {}),
      method: "POST",
    })
    .then(readJson<StorefrontMediaUpload>);
}

function createHeaders(auth: SettingsAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  return headers;
}

function createEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Galeria da loja" });
}

async function readUploadResponse(response: Response) {
  if (!response.ok) {
    throw new Error("Não foi possível enviar a imagem para o R2.");
  }
}
