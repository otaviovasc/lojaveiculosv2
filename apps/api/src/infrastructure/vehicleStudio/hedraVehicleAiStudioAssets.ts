import { VehicleAiStudioProviderError } from "../../domains/vehicle/ports/vehicleAiStudioProvider.js";
import {
  authValue,
  createProviderHttpError,
  fetchWithTimeout,
  previewPayload,
  toUrl,
} from "./hedraVehicleAiStudioHttp.js";

export async function uploadHedraSourceImageAsset(input: {
  apiKey: string;
  assetPath: string;
  authHeader: string;
  authScheme: string;
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  requestTimeoutMs: number;
  sourceImageUrl: string;
  uploadAssetPath: string;
}) {
  const source = await downloadSourceImage(input);
  const assetId = await createImageAsset(input, source.fileName);
  await uploadImageAsset(input, assetId, source);
  return assetId;
}

async function downloadSourceImage(input: {
  fetch: typeof globalThis.fetch;
  requestTimeoutMs: number;
  sourceImageUrl: string;
}) {
  const response = await fetchWithTimeout(
    input.fetch,
    input.sourceImageUrl,
    {},
    { phase: "source-download", requestTimeoutMs: input.requestTimeoutMs },
  );
  if (!response.ok) {
    throw await createProviderHttpError(response, {
      phase: "source-download",
      url: input.sourceImageUrl,
    });
  }

  const contentType =
    response.headers.get("content-type") ??
    contentTypeFromUrl(input.sourceImageUrl);
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType,
    fileName: fileNameFromSourceUrl(input.sourceImageUrl, contentType),
  };
}

async function createImageAsset(
  input: {
    apiKey: string;
    assetPath: string;
    authHeader: string;
    authScheme: string;
    baseUrl: string;
    fetch: typeof globalThis.fetch;
    requestTimeoutMs: number;
  },
  fileName: string,
) {
  const url = toUrl(input.baseUrl, input.assetPath);
  const response = await fetchWithTimeout(
    input.fetch,
    url,
    {
      body: JSON.stringify({ name: fileName, type: "image" }),
      headers: {
        [input.authHeader]: authValue(
          input.authHeader,
          input.authScheme,
          input.apiKey,
        ),
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    { phase: "asset-create", requestTimeoutMs: input.requestTimeoutMs },
  );
  if (!response.ok) {
    throw await createProviderHttpError(response, {
      phase: "asset-create",
      url,
    });
  }

  const payload: unknown = await response.json();
  const assetId = readString((payload as { id?: unknown } | null)?.id);
  if (!assetId) {
    throw new VehicleAiStudioProviderError(
      "Hedra image source asset creation returned no asset id.",
      502,
      {
        ...previewPayload(payload),
        phase: "asset-create",
        provider: "hedra",
      },
    );
  }

  return assetId;
}

async function uploadImageAsset(
  input: {
    apiKey: string;
    authHeader: string;
    authScheme: string;
    baseUrl: string;
    fetch: typeof globalThis.fetch;
    requestTimeoutMs: number;
    uploadAssetPath: string;
  },
  assetId: string,
  source: { bytes: Uint8Array; contentType: string; fileName: string },
) {
  const url = toUrl(
    input.baseUrl,
    input.uploadAssetPath.replace("{id}", assetId),
  );
  const body = new FormData();
  const bytes = source.bytes.buffer.slice(
    source.bytes.byteOffset,
    source.bytes.byteOffset + source.bytes.byteLength,
  ) as ArrayBuffer;
  body.append(
    "file",
    new Blob([bytes], { type: source.contentType }),
    source.fileName,
  );

  const response = await fetchWithTimeout(
    input.fetch,
    url,
    {
      body,
      headers: {
        [input.authHeader]: authValue(
          input.authHeader,
          input.authScheme,
          input.apiKey,
        ),
      },
      method: "POST",
    },
    { phase: "asset-upload", requestTimeoutMs: input.requestTimeoutMs },
  );
  if (!response.ok) {
    throw await createProviderHttpError(response, {
      phase: "asset-upload",
      url,
    });
  }
}

function fileNameFromSourceUrl(sourceImageUrl: string, contentType: string) {
  try {
    const parsed = new URL(sourceImageUrl);
    const name = parsed.pathname.split("/").filter(Boolean).at(-1);
    if (name?.includes(".")) return name;
  } catch {
    const name = sourceImageUrl
      .split("?")[0]
      ?.split("/")
      .filter(Boolean)
      .at(-1);
    if (name?.includes(".")) return name;
  }
  return `vehicle-source.${extensionForContentType(contentType)}`;
}

function contentTypeFromUrl(sourceImageUrl: string) {
  const path = sourceImageUrl.toLowerCase().split("?")[0] ?? "";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/png";
}

function extensionForContentType(contentType: string) {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  return "png";
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
