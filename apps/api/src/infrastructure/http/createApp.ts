import { Hono } from "hono";
import { docsFeature } from "../../features/docs/controllers/docs.controller.js";
import { createInventoryFeature } from "../../features/inventory/controllers/vehicle.controller.js";
import type { StoreAccessRepository } from "../../domains/identity/ports/storeAccessRepository.js";
import { createHttpServiceContext } from "./createHttpServiceContext.js";

export type CreateAppOptions = {
  storeAccessRepository?: StoreAccessRepository;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();
  const contextOptions = options.storeAccessRepository
    ? { repository: options.storeAccessRepository }
    : {};

  app.route("/", docsFeature);
  app.get("/health", (context) => context.json({ ok: true }));
  app.route(
    "/api/v1/inventory",
    createInventoryFeature({
      contextFactory: (context) =>
        createHttpServiceContext(context, contextOptions),
    }),
  );

  return app;
}
