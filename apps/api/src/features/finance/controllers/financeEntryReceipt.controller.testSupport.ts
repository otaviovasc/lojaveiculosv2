import { vi } from "vitest";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import { createMemoryObjectStorage } from "../../../infrastructure/storage/memoryObjectStorage.js";

export function createConcurrentReceiptStorage() {
  const base = createMemoryObjectStorage();
  let putCount = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const deleteObject = vi.fn(async () => undefined);
  const storage: ObjectStorage = {
    ...base,
    deleteObject,
    async putObject(input) {
      putCount += 1;
      if (putCount === 2) release();
      await gate;
      return base.putObject(input);
    },
  };
  return { deleteObject, storage };
}
