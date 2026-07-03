import type {
  StorefrontMediaAsset,
  StorefrontMediaUpload,
} from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import type { StorefrontMediaRepository } from "../../../domains/storefront/ports/storefrontMediaRepository.js";
import { listStorefrontMediaAssets } from "../../../domains/storefront/services/StorefrontService/listStorefrontMediaAssets.js";
import {
  completeStorefrontMediaUpload,
  type CompleteStorefrontMediaUploadInput,
} from "../../../domains/storefront/services/StorefrontService/completeStorefrontMediaUpload.js";
import {
  requestStorefrontMediaUpload,
  type RequestStorefrontMediaUploadInput,
} from "../../../domains/storefront/services/StorefrontService/requestStorefrontMediaUpload.js";
import { createMemoryObjectStorage } from "../../../infrastructure/storage/memoryObjectStorage.js";
import { createMemoryStorefrontMediaRepository } from "../adapters/memory/storefrontMediaRepository.js";

export type StorefrontMediaServices = {
  completeUpload: (
    context: ServiceContext,
    input: CompleteStorefrontMediaUploadInput,
  ) => Promise<StorefrontMediaAsset>;
  listAssets: (
    context: ServiceContext,
  ) => Promise<readonly StorefrontMediaAsset[]>;
  requestUpload: (
    context: ServiceContext,
    input: RequestStorefrontMediaUploadInput,
  ) => Promise<StorefrontMediaUpload>;
};

export type CreateStorefrontMediaServicesOptions = {
  repository?: StorefrontMediaRepository;
  storage?: ObjectStorage;
};

export function createStorefrontMediaServices(
  options: CreateStorefrontMediaServicesOptions = {},
): StorefrontMediaServices {
  const repository =
    options.repository ?? createMemoryStorefrontMediaRepository();
  const storage = options.storage ?? createMemoryObjectStorage();

  return {
    completeUpload: (context, input) =>
      completeStorefrontMediaUpload(context, input, { repository, storage }),
    listAssets: (context) => listStorefrontMediaAssets(context, repository),
    requestUpload: (context, input) =>
      requestStorefrontMediaUpload(context, input, { storage }),
  };
}

export const storefrontMediaServices = createStorefrontMediaServices();
