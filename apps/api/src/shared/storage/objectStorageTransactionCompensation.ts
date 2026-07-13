import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../serviceContext.js";
import type { TransactionRunner } from "../transaction.js";
import type { ObjectStorage } from "./objectStorage.js";

export type ObjectStorageTransactionCompensationAdapter<TPorts> = {
  getStorage: (ports: TPorts) => ObjectStorage | undefined;
  withStorage: (ports: TPorts, storage: ObjectStorage) => TPorts;
};

export class ObjectStorageCompensationUnsupportedError extends Error {
  constructor() {
    super("Workflow object storage must support compensating deletes.");
    this.name = "ObjectStorageCompensationUnsupportedError";
  }
}

export class ObjectStorageDeletionCompensationUnsupportedError extends Error {
  constructor() {
    super(
      "Workflow object storage cannot compensate deletion of existing objects.",
    );
    this.name = "ObjectStorageDeletionCompensationUnsupportedError";
  }
}

export class ObjectStorageTransactionCompensationError extends Error {
  constructor(
    readonly operationError: unknown,
    readonly cleanupError: unknown,
  ) {
    super("Workflow failed and stored document cleanup also failed.", {
      cause: operationError,
    });
    this.name = "ObjectStorageTransactionCompensationError";
  }
}

export async function runWithObjectStorageTransactionCompensation<
  TPorts,
  TResult,
>(
  context: ServiceContext,
  transactionRunner: TransactionRunner<TPorts>,
  operation: (ports: TPorts) => Promise<TResult>,
  adapter: ObjectStorageTransactionCompensationAdapter<TPorts>,
): Promise<TResult> {
  const state: { compensation: ObjectStorageCompensation | null } = {
    compensation: null,
  };
  try {
    return await transactionRunner.runInTransaction((ports) => {
      const storage = adapter.getStorage(ports);
      if (!storage) return operation(ports);
      state.compensation = createObjectStorageCompensation(storage);
      return operation(adapter.withStorage(ports, state.compensation.storage));
    });
  } catch (error) {
    const compensation = state.compensation;
    if (!compensation || compensation.objectCount === 0) throw error;
    const objectCount = compensation.objectCount;
    try {
      await compensation.cleanup();
      context.logger.info(
        "object_storage.transaction_cleanup.completed",
        createServiceLogMetadata(context, {
          objectCount,
        }),
      );
    } catch (cleanupError) {
      context.logger.warn(
        "object_storage.transaction_cleanup.failed",
        createServiceLogMetadata(context, {
          cleanupErrorName: errorName(cleanupError),
          objectCount,
          operationErrorName: errorName(error),
        }),
      );
      throw new ObjectStorageTransactionCompensationError(error, cleanupError);
    }
    throw error;
  }
}

type ObjectStorageCompensation = {
  cleanup: () => Promise<void>;
  readonly objectCount: number;
  storage: ObjectStorage;
};

function createObjectStorageCompensation(
  storage: ObjectStorage,
): ObjectStorageCompensation {
  const deleteObject = storage.deleteObject;
  const storageKeys = new Set<string>();
  const trackedStorage: ObjectStorage = {
    ...storage,
    async putObject(input) {
      if (!deleteObject) {
        throw new ObjectStorageCompensationUnsupportedError();
      }
      const object = await storage.putObject(input);
      storageKeys.add(object.storageKey);
      return object;
    },
  };
  if (deleteObject) {
    trackedStorage.deleteObject = async (input) => {
      if (!storageKeys.has(input.storageKey)) {
        throw new ObjectStorageDeletionCompensationUnsupportedError();
      }
      await deleteObject(input);
      storageKeys.delete(input.storageKey);
    };
  }
  return {
    async cleanup() {
      if (!deleteObject) return;
      const trackedKeys = [...storageKeys].reverse();
      const results = await Promise.allSettled(
        trackedKeys.map((storageKey) => deleteObject({ storageKey })),
      );
      const failures: unknown[] = [];
      for (const [index, result] of results.entries()) {
        if (result.status === "rejected") {
          failures.push(result.reason as unknown);
        } else {
          const storageKey = trackedKeys[index];
          if (storageKey) storageKeys.delete(storageKey);
        }
      }
      if (failures.length) {
        throw new AggregateError(
          failures,
          "Stored workflow document cleanup failed.",
        );
      }
    },
    get objectCount() {
      return storageKeys.size;
    },
    storage: trackedStorage,
  };
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
