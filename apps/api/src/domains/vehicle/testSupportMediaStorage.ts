import { vi } from "vitest";
import type {
  PutVehicleStorageObjectInput,
  VehicleMediaStorage,
} from "./ports/vehicleMediaStorage.js";
import type { CreateObjectUploadInput } from "../../shared/storage/objectStorage.js";

export function createTestVehicleMediaStorage(): VehicleMediaStorage {
  return {
    createUpload: vi.fn(async (input: CreateObjectUploadInput) => {
      const storageKey = createStorageKey(input);
      return {
        expiresAt: new Date("2026-01-01T00:15:00.000Z"),
        publicUrl: `https://cdn.local/${storageKey}`,
        storageKey,
        uploadHeaders: { "content-type": input.contentType },
        uploadMethod: "PUT" as const,
        uploadUrl: `https://upload.local/${storageKey}`,
      };
    }),
    getPublicUrl: (storageKey) => `https://cdn.local/${storageKey}`,
    putObject: vi.fn(async (input: PutVehicleStorageObjectInput) => {
      const storageKey = createStorageKey({
        fileName: input.fileName,
        scopeSegments: input.scopeSegments,
      });
      return { publicUrl: `https://cdn.local/${storageKey}`, storageKey };
    }),
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
