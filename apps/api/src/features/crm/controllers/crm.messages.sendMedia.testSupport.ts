import { vi } from "vitest";
import { Buffer } from "node:buffer";
import type { CrmAudioNormalizer } from "../../../domains/crm/ports/crmAudioNormalizer.js";
import type {
  ObjectStorage,
  PutStorageObjectInput,
} from "../../../shared/storage/objectStorage.js";

export function createTestObjectStorage(): {
  putObject: ReturnType<
    typeof vi.fn<
      (input: PutStorageObjectInput) => Promise<{
        publicUrl: string;
        storageKey: string;
      }>
    >
  >;
  storage: ObjectStorage;
} {
  const putObject = vi.fn(async (input: PutStorageObjectInput) => ({
    publicUrl: `https://cdn.local/crm-whatsapp/${input.fileName}`,
    storageKey: `crm-whatsapp/${input.fileName}`,
  }));
  return {
    putObject,
    storage: {
      createDownload: vi.fn(),
      createUpload: vi.fn(),
      getPublicUrl: (storageKey) => `https://cdn.local/${storageKey}`,
      putObject,
    },
  };
}

export function createTestCrmAudioNormalizer(): {
  normalizer: CrmAudioNormalizer;
  normalizeToOggOpus: ReturnType<
    typeof vi.fn<CrmAudioNormalizer["normalizeToOggOpus"]>
  >;
} {
  const normalizeToOggOpus = vi.fn(
    async () => new Uint8Array(Buffer.from("OggS-normalized-audio")),
  );
  return {
    normalizer: { normalizeToOggOpus },
    normalizeToOggOpus,
  };
}
