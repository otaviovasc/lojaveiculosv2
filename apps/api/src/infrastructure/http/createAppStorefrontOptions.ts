import type { CreateStorefrontFeatureOptions } from "../../features/storefront/controllers/storefront.controller.js";
import type { CreateAppOptions } from "./createAppOptions.js";

export function createPublicStorefrontFeatureOptions(
  options: CreateAppOptions,
): CreateStorefrontFeatureOptions {
  if (!options.publicStorefrontRepository) return {};
  return {
    ...(options.audit ? { audit: options.audit } : {}),
    ...(options.publicStorefrontCrmRepository
      ? { crmRepository: options.publicStorefrontCrmRepository }
      : {}),
    ...(options.publicStorefrontCrmPipelineRepository
      ? { crmPipelineRepository: options.publicStorefrontCrmPipelineRepository }
      : {}),
    ...(options.publicStorefrontCrmTransaction
      ? { crmTransaction: options.publicStorefrontCrmTransaction }
      : {}),
    ...(options.storefrontPageRepository
      ? { pageRepository: options.storefrontPageRepository }
      : {}),
    repository: options.publicStorefrontRepository,
  };
}
