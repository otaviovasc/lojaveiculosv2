import { describe, expect, it, vi } from "vitest";
import type { VehicleMedia } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import {
  proxyVehicleMediaContent,
  VehicleMediaContentDeliveryError,
} from "./proxyVehicleMediaContent.js";

const media: VehicleMedia = {
  altText: "Front photo",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  displayOrder: 0,
  id: "media_1",
  isPublic: true,
  kind: "photo",
  storageKey: "tenants/tenant_1/stores/store_1/units/unit_1/front.jpg",
  storeId: "store_1",
  tenantId: "tenant_1",
  unitId: "unit_1",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  url: "https://assets.example.com/front.jpg",
};

describe("proxyVehicleMediaContent", () => {
  it("returns a safe image response without exposing the storage URL", async () => {
    const fetcher = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(new Uint8Array([255, 216, 255, 217]), {
          headers: { "content-length": "4", "content-type": "image/jpeg" },
        }),
    );

    const response = await proxyVehicleMediaContent(media, fetcher);

    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[0]).toBe(media.url);
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([255, 216, 255, 217]),
    );
  });

  it("rejects unsupported media and oversized payloads", async () => {
    await expect(
      proxyVehicleMediaContent({ ...media, kind: "video" }),
    ).rejects.toMatchObject({ statusCode: 415 });

    await expect(
      proxyVehicleMediaContent(
        media,
        async () =>
          new Response(new Uint8Array(10), {
            headers: { "content-type": "image/png" },
          }),
        { maxBytes: 5 },
      ),
    ).rejects.toBeInstanceOf(VehicleMediaContentDeliveryError);
  });
});
