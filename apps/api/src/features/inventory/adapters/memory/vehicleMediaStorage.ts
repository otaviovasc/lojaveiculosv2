import type { VehicleMediaStorage } from "../../../../domains/vehicle/ports/vehicleMediaStorage.js";
import type { CreateObjectUploadInput } from "../../../../shared/storage/objectStorage.js";

export function createMemoryVehicleMediaStorage(): VehicleMediaStorage {
  return {
    createDownload: async (input) => ({
      downloadMethod: "GET",
      downloadUrl: `https://download.local/${input.storageKey}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    }),
    createUpload: async (input) => {
      const storageKey = createStorageKey(input);
      return {
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        publicUrl: `https://cdn.local/${storageKey}`,
        storageKey,
        uploadHeaders: { "content-type": input.contentType },
        uploadMethod: "PUT",
        uploadUrl: `https://upload.local/${storageKey}`,
      };
    },
    getPublicUrl: (storageKey) => `https://cdn.local/${storageKey}`,
    putObject: async (input) => {
      const storageKey = createStorageKey({
        fileName: input.fileName,
        scopeSegments: input.scopeSegments,
      });
      return { publicUrl: `https://cdn.local/${storageKey}`, storageKey };
    },
  };
}

function createStorageKey(
  input:
    | CreateObjectUploadInput
    | {
        fileName: string;
        scopeSegments: readonly string[];
      },
): string {
  return [...input.scopeSegments, input.fileName].join("/");
}
