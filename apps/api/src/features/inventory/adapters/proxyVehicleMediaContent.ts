import type { VehicleMedia } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;
const SAFE_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type VehicleMediaContentFetcher = typeof fetch;

export class VehicleMediaContentDeliveryError extends Error {
  readonly statusCode: 415 | 502;

  constructor(statusCode: 415 | 502 = 502) {
    super(
      statusCode === 415
        ? "Vehicle media is not a supported image."
        : "Vehicle media could not be delivered.",
    );
    this.name = "VehicleMediaContentDeliveryError";
    this.statusCode = statusCode;
  }
}

export async function proxyVehicleMediaContent(
  media: VehicleMedia,
  fetcher: VehicleMediaContentFetcher = fetch,
  policy: { maxBytes?: number; timeoutMs?: number } = {},
) {
  if (media.kind !== "photo") {
    throw new VehicleMediaContentDeliveryError(415);
  }

  const url = safeHttpUrl(media.url);
  const maxBytes = policy.maxBytes ?? DEFAULT_MAX_BYTES;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    policy.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const upstream = await fetcher(url, { signal: controller.signal });
    if (!upstream.ok) throw new VehicleMediaContentDeliveryError();

    const contentType = upstream.headers.get("content-type")?.split(";")[0];
    if (!contentType || !SAFE_IMAGE_TYPES.has(contentType.toLowerCase())) {
      throw new VehicleMediaContentDeliveryError(415);
    }

    const declaredLength = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new VehicleMediaContentDeliveryError();
    }

    const content = await upstream.arrayBuffer();
    if (content.byteLength > maxBytes) {
      throw new VehicleMediaContentDeliveryError();
    }

    return new Response(content, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Type": contentType,
        "Cross-Origin-Resource-Policy": "same-site",
        "X-Content-Type-Options": "nosniff",
      },
      status: 200,
    });
  } catch (error) {
    if (error instanceof VehicleMediaContentDeliveryError) throw error;
    throw new VehicleMediaContentDeliveryError();
  } finally {
    clearTimeout(timeout);
  }
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      throw new Error();
    return url.toString();
  } catch {
    throw new VehicleMediaContentDeliveryError();
  }
}
