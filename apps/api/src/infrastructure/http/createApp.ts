import { Hono } from "hono";
import type { AuditSink } from "@lojaveiculosv2/audit";
import type { InventoryListingServices } from "../../features/inventory/controllers/listingServices.js";
import { docsFeature } from "../../features/docs/controllers/docs.controller.js";
import { createInventoryFeature } from "../../features/inventory/controllers/vehicle.controller.js";
import { createStorefrontFeature } from "../../features/storefront/controllers/storefront.controller.js";
import type { StoreAccessRepository } from "../../domains/identity/ports/storeAccessRepository.js";
import type { PublicStorefrontRepository } from "../../domains/storefront/ports/publicStorefrontRepository.js";
import { createHttpServiceContext } from "./createHttpServiceContext.js";
import type { HttpIdentityVerifier } from "./httpIdentityVerifier.js";

export type CreateAppOptions = {
  audit?: AuditSink;
  identityVerifier?: HttpIdentityVerifier;
  inventoryListingServices?: InventoryListingServices;
  publicStorefrontRepository?: PublicStorefrontRepository;
  storeAccessRepository?: StoreAccessRepository;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();
  const contextOptions = options.storeAccessRepository
    ? {
        ...(options.audit ? { audit: options.audit } : {}),
        ...(options.identityVerifier
          ? { identityVerifier: options.identityVerifier }
          : {}),
        repository: options.storeAccessRepository,
      }
    : {};
  const storefrontOptions = options.publicStorefrontRepository
    ? {
        ...(options.audit ? { audit: options.audit } : {}),
        repository: options.publicStorefrontRepository,
      }
    : {};

  app.route("/", docsFeature);
  app.get("/health", (context) => context.json({ ok: true }));
  app.route(
    "/api/v1/public/storefront",
    createStorefrontFeature(storefrontOptions),
  );
  app.route(
    "/api/v1/inventory",
    createInventoryFeature({
      contextFactory: (context) =>
        createHttpServiceContext(context, contextOptions),
      ...(options.inventoryListingServices
        ? { services: options.inventoryListingServices }
        : {}),
    }),
  );

  return app;
}
