import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../serviceContext.js";
import type { TransactionRunner } from "../transaction.js";
import type { ObjectStorage } from "./objectStorage.js";
import {
  type ObjectStorageTransactionCompensationAdapter,
  ObjectStorageCompensationUnsupportedError,
  ObjectStorageDeletionCompensationUnsupportedError,
  ObjectStorageTransactionCompensationError,
  runWithObjectStorageTransactionCompensation,
} from "./objectStorageTransactionCompensation.js";

type StoragePorts = { storage: ObjectStorage };

describe("object storage transaction compensation", () => {
  it("deletes new objects when the transaction fails", async () => {
    const storage = createStorage();
    const error = new Error("commit failed");

    await expect(
      run(storage, async (trackedStorage) => {
        await trackedStorage.putObject(objectInput());
        throw error;
      }),
    ).rejects.toBe(error);

    expect(storage.deleteObject).toHaveBeenCalledWith({
      storageKey: "documents/generated.pdf",
    });
  });

  it("allows no-write transactions when delete support is absent", async () => {
    const storage = createStorage({ supportsDelete: false });

    await expect(run(storage, async () => "ok")).resolves.toBe("ok");
    await expect(
      run(storage, (trackedStorage) => trackedStorage.putObject(objectInput())),
    ).rejects.toBeInstanceOf(ObjectStorageCompensationUnsupportedError);
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it("rejects deletion of objects not created by the transaction", async () => {
    const storage = createStorage();

    await expect(
      run(storage, async (trackedStorage) => {
        await trackedStorage.deleteObject?.({ storageKey: "existing.pdf" });
      }),
    ).rejects.toBeInstanceOf(ObjectStorageDeletionCompensationUnsupportedError);
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it("preserves both errors when compensating deletion fails", async () => {
    const cleanupError = new Error("delete failed");
    const operationError = new Error("commit failed");
    const storage = createStorage({ cleanupError });

    const result = run(storage, async (trackedStorage) => {
      await trackedStorage.putObject(objectInput());
      throw operationError;
    });

    const error = await result.catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ObjectStorageTransactionCompensationError);
    expect(error).toMatchObject({ operationError });
    expect(
      (error as ObjectStorageTransactionCompensationError).cleanupError,
    ).toMatchObject({ errors: [cleanupError] });
  });
});

function run<TResult>(
  storage: ObjectStorage,
  operation: (storage: ObjectStorage) => Promise<TResult>,
) {
  const transactionRunner: TransactionRunner<StoragePorts> = {
    runInTransaction: (transactionOperation) =>
      transactionOperation({ storage }),
  };
  const adapter: ObjectStorageTransactionCompensationAdapter<StoragePorts> = {
    getStorage: (ports) => ports.storage,
    withStorage: (ports, trackedStorage) => ({
      ...ports,
      storage: trackedStorage,
    }),
  };
  return runWithObjectStorageTransactionCompensation(
    createServiceContext({ request: { requestId: "request_1" } }),
    transactionRunner,
    (ports) => operation(ports.storage),
    adapter,
  );
}

function createStorage(
  options: { cleanupError?: Error; supportsDelete?: boolean } = {},
): ObjectStorage {
  const storage: ObjectStorage = {
    createDownload: vi.fn(),
    createUpload: vi.fn(),
    getPublicUrl: (storageKey) => storageKey,
    putObject: vi.fn(async () => ({
      publicUrl: "https://cdn.example/generated.pdf",
      storageKey: "documents/generated.pdf",
    })),
  };
  if (options.supportsDelete !== false) {
    storage.deleteObject = vi.fn(async () => {
      if (options.cleanupError) throw options.cleanupError;
    });
  }
  return storage;
}

function objectInput() {
  return {
    body: new Uint8Array([1]),
    contentType: "application/pdf",
    fileName: "generated.pdf",
    scopeSegments: ["documents"],
  };
}
