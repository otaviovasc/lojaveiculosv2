import { describe, expect, it, vi } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import { createVehicleMedia } from "./createVehicleMedia.js";
import { getVehicleMedia } from "./getVehicleMedia.js";
import { requestVehicleMediaUpload } from "./requestVehicleMediaUpload.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("getVehicleMedia", () => {
  it("reads media inside the tenant/store scope and audits access", async () => {
    const context = createContext(["inventory.create", "inventory.read"]);
    const ports = createInMemoryVehiclePorts([createListing()]);
    const unit = await attachVehicleUnit(
      context,
      { listingId: "listing_1" },
      ports,
    );
    const upload = await requestVehicleMediaUpload(
      context,
      {
        contentType: "image/jpeg",
        fileName: "front.jpg",
        kind: "photo",
        sizeBytes: 2048,
        unitId: unit.id,
      },
      ports,
    );
    const created = await createVehicleMedia(
      context,
      { kind: "photo", storageKey: upload.storageKey, unitId: unit.id },
      ports,
    );

    const media = await getVehicleMedia(
      context,
      { mediaId: created.id, unitId: unit.id },
      ports,
    );

    expect(media.id).toBe(created.id);
    expect(
      vi
        .mocked(context.audit.record)
        .mock.calls.map(([event]) => event)
        .find((event) => event.action === "vehicle_media.get"),
    ).toMatchObject({
      category: "data_access",
      entityId: created.id,
    });
  });
});
