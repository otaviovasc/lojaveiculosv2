import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  StorefrontPageCreateInput,
  StorefrontPageRepository,
  StorefrontPageUpdateInput,
} from "../../../domains/storefront/ports/storefrontPageRepository.js";
import { createStorefrontCustomPage } from "../../../domains/storefront/services/StorefrontService/createStorefrontCustomPage.js";
import { deleteStorefrontCustomPage } from "../../../domains/storefront/services/StorefrontService/deleteStorefrontCustomPage.js";
import { getStorefrontCustomPage } from "../../../domains/storefront/services/StorefrontService/getStorefrontCustomPage.js";
import { listStorefrontCustomPages } from "../../../domains/storefront/services/StorefrontService/listStorefrontCustomPages.js";
import { updateStorefrontCustomPage } from "../../../domains/storefront/services/StorefrontService/updateStorefrontCustomPage.js";
import { createMemoryStorefrontPageRepository } from "../adapters/memory/storefrontPageRepository.js";

export type StorefrontPageServices = {
  createPage: (
    context: ServiceContext,
    input: StorefrontPageCreateInput,
  ) => Promise<StorefrontCustomPage>;
  deletePage: (
    context: ServiceContext,
    pageId: string,
  ) => Promise<{ deleted: boolean }>;
  getPage: (
    context: ServiceContext,
    pageId: string,
  ) => Promise<StorefrontCustomPage>;
  listPages: (
    context: ServiceContext,
  ) => Promise<readonly StorefrontCustomPage[]>;
  updatePage: (
    context: ServiceContext,
    pageId: string,
    input: StorefrontPageUpdateInput,
  ) => Promise<StorefrontCustomPage>;
};

export type CreateStorefrontPageServicesOptions = {
  repository?: StorefrontPageRepository;
};

export function createStorefrontPageServices(
  options: CreateStorefrontPageServicesOptions = {},
): StorefrontPageServices {
  const repository =
    options.repository ?? createMemoryStorefrontPageRepository();

  return {
    createPage: (context, input) =>
      createStorefrontCustomPage(context, input, repository),
    deletePage: (context, pageId) =>
      deleteStorefrontCustomPage(context, pageId, repository),
    getPage: (context, pageId) =>
      getStorefrontCustomPage(context, pageId, repository),
    listPages: (context) => listStorefrontCustomPages(context, repository),
    updatePage: (context, pageId, input) =>
      updateStorefrontCustomPage(context, pageId, input, repository),
  };
}

export const storefrontPageServices = createStorefrontPageServices();
