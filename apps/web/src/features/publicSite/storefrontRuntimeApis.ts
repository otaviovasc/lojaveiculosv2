import { createSettingsApiOptions } from "../settings/runtimeApi";
export { createRuntimeSettingsApi } from "../settings/runtimeSettingsApi";
import {
  createStorefrontPagesApi,
  type StorefrontPagesApi,
} from "./storefrontPagesApi";
import {
  createStorefrontMediaApi,
  type StorefrontMediaApi,
} from "./storefrontMediaApi";

export function createRuntimeStorefrontPagesApi(): StorefrontPagesApi {
  return {
    createPage: async (input) =>
      createStorefrontPagesApi(await createSettingsApiOptions()).createPage(
        input,
      ),
    deletePage: async (pageId) =>
      createStorefrontPagesApi(await createSettingsApiOptions()).deletePage(
        pageId,
      ),
    getPage: async (pageId) =>
      createStorefrontPagesApi(await createSettingsApiOptions()).getPage(
        pageId,
      ),
    listPages: async () =>
      createStorefrontPagesApi(await createSettingsApiOptions()).listPages(),
    updatePage: async (pageId, input) =>
      createStorefrontPagesApi(await createSettingsApiOptions()).updatePage(
        pageId,
        input,
      ),
  };
}

export function createRuntimeStorefrontMediaApi(): StorefrontMediaApi {
  return {
    listAssets: async () =>
      createStorefrontMediaApi(await createSettingsApiOptions()).listAssets(),
    uploadImage: async (input) =>
      createStorefrontMediaApi(await createSettingsApiOptions()).uploadImage(
        input,
      ),
  };
}
