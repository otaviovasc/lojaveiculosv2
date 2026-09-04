import type { Hono } from "hono";
import {
  createFiscalFeature,
  type FiscalContextFactory,
} from "../../features/fiscal/controllers/fiscal.controller.js";
import type { CreateAppOptions } from "./createAppOptions.js";
import { createFiscalWebhookContextFactory } from "./fiscalWebhookContextFactory.js";

export function installFiscalRoutes(
  app: Hono,
  options: CreateAppOptions,
  contextFactory: FiscalContextFactory,
) {
  app.route(
    "/api/v1/fiscal",
    createFiscalFeature({
      contextFactory,
      webhookContextFactory: createFiscalWebhookContextFactory(options.audit),
      ...(options.fiscalServices ? { services: options.fiscalServices } : {}),
    }),
  );
}
