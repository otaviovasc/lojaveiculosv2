import type {
  CreateObjectUploadInput,
  ObjectStorage,
} from "../../shared/storage/objectStorage.js";

const localEnvironmentPrefix = "l";

export function createMemoryObjectStorage(): ObjectStorage {
  return {
    async createDownload(input) {
      return {
        downloadMethod: "GET",
        downloadUrl: `https://download.local/${input.storageKey}`,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };
    },
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
    deleteObject: async () => undefined,
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
        idempotencyKey?: string;
        scopeSegments: readonly string[];
      },
): string {
  const fileName =
    "idempotencyKey" in input && input.idempotencyKey
      ? `${input.idempotencyKey}-${input.fileName}`
      : input.fileName;
  return [localEnvironmentPrefix, ...input.scopeSegments, fileName].join("/");
}
