import type {
  CreateObjectUploadInput,
  ObjectStorage,
} from "../../shared/storage/objectStorage.js";

export function createMemoryObjectStorage(): ObjectStorage {
  return {
    async createUpload(input) {
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
    async putObject(input) {
      const storageKey = createStorageKey(input);
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
