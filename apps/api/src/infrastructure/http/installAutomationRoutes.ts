import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../shared/serviceContext.js";
import { createAutomationFeature } from "../../features/automation/controllers/automation.controller.js";
import type { CreateAppOptions } from "./createAppOptions.js";

export function installAutomationRoutes(
  app: Hono,
  options: CreateAppOptions,
  contextFactory: (context: Context) => Promise<ServiceContext>,
) {
  app.route(
    "/api/v1/automation",
    createAutomationFeature({
      contextFactory,
      ...(options.automationServices
        ? { services: options.automationServices }
        : {}),
    }),
  );
}
