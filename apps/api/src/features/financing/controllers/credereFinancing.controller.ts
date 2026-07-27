import { Hono } from "hono";
import {
  defaultAgencyAccountContextFactory,
  defaultFinancingContextFactory,
  type AgencyAccountContextFactory,
  type FinancingContextFactory,
} from "./credereFinancing.controller.context.js";
import { registerAgencyCredereFinancingRoutes } from "./credereFinancing.agencyRoutes.js";
import { registerDirectOwnerCredereFinancingRoutes } from "./credereFinancing.directOwnerRoutes.js";
import { registerPublicCredereOauthRoutes } from "./credereFinancing.oauthRoutes.js";
import { registerStoreCredereFinancingRoutes } from "./credereFinancing.storeRoutes.js";
import {
  credereFinancingServices,
  type CredereFinancingServices,
} from "./credereFinancingServices.js";

export type CreateCredereFinancingFeatureOptions = {
  contextFactory?: FinancingContextFactory;
  services?: CredereFinancingServices;
};

export type CreateAgencyCredereFinancingFeatureOptions = {
  accountContextFactory?: AgencyAccountContextFactory;
  services?: CredereFinancingServices;
};

export function createCredereFinancingFeature(
  options: CreateCredereFinancingFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? credereFinancingServices;
  const contextFactory =
    options.contextFactory ?? defaultFinancingContextFactory;
  registerPublicCredereOauthRoutes(feature, { services });
  registerDirectOwnerCredereFinancingRoutes(feature, {
    contextFactory,
    services,
  });
  registerStoreCredereFinancingRoutes(feature, { contextFactory, services });
  return feature;
}

export function createAgencyCredereFinancingFeature(
  options: CreateAgencyCredereFinancingFeatureOptions = {},
) {
  const feature = new Hono();
  registerAgencyCredereFinancingRoutes(feature, {
    accountContextFactory:
      options.accountContextFactory ?? defaultAgencyAccountContextFactory,
    services: options.services ?? credereFinancingServices,
  });
  return feature;
}
