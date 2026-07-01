import { describe, expect, it, vi } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import { createVehicleMedia } from "./createVehicleMedia.js";
import { deleteVehicleMedia } from "./deleteVehicleMedia.js";
import { requestVehicleMediaUpload } from "./requestVehicleMediaUpload.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("deleteVehicleMedia", () => {
  it("soft-deletes media metadata and requests storage object cleanup", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.media_delete",
    ]);
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
    const media = await createVehicleMedia(
      context,
      { kind: "photo", storageKey: upload.storageKey, unitId: unit.id },
      ports,
    );

    const deleted = await deleteVehicleMedia(
      context,
      { mediaId: media.id, unitId: unit.id },
      ports,
    );

    expect(deleted.id).toBe(media.id);
    if (!ports.mediaStorage?.deleteObject) {
      throw new Error("Expected media storage delete support.");
    }
    expect(ports.mediaStorage.deleteObject).toHaveBeenCalledWith({
      storageKey: upload.storageKey,
    });
    const auditEvent = vi
      .mocked(context.audit.record)
      .mock.calls.map(([event]) => event)
      .find((event) => event.action === "vehicle_media.delete");
    expect(auditEvent?.action).toBe("vehicle_media.delete");
    expect(auditEvent?.metadata).toMatchObject({ objectCleanup: "deleted" });
  });

  it("keeps the media delete successful when storage cleanup fails", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.media_delete",
    ]);
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
    const media = await createVehicleMedia(
      context,
      { kind: "photo", storageKey: upload.storageKey, unitId: unit.id },
      ports,
    );
    if (!ports.mediaStorage?.deleteObject) {
      throw new Error("Expected media storage delete support.");
    }
    vi.mocked(ports.mediaStorage.deleteObject).mockRejectedValueOnce(
      new Error("r2 timeout"),
    );

    const deleted = await deleteVehicleMedia(
      context,
      { mediaId: media.id, unitId: unit.id },
      ports,
    );

    expect(deleted.id).toBe(media.id);
    expect(context.logger.warn).toHaveBeenCalledWith(
      "vehicle_media.object_cleanup.failed",
      expect.objectContaining({
        errorMessage: "r2 timeout",
        mediaId: media.id,
        storageKey: upload.storageKey,
        unitId: unit.id,
      }),
    );
    const auditEvent = vi
      .mocked(context.audit.record)
      .mock.calls.map(([event]) => event)
      .find((event) => event.action === "vehicle_media.delete");
    expect(auditEvent?.action).toBe("vehicle_media.delete");
    expect(auditEvent?.metadata).toMatchObject({
      objectCleanup: "failed",
      objectCleanupError: "r2 timeout",
    });
  });
});
