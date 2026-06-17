import { Hono } from "hono";
import { docsFeature } from "../../features/docs/controllers/docs.controller.js";
import { vehicleFeature } from "../../features/inventory/controllers/vehicle.controller.js";

export function createApp() {
  const app = new Hono();

  app.route("/", docsFeature);
  app.get("/health", (context) => context.json({ ok: true }));
  app.route("/api/v1/inventory", vehicleFeature);

  return app;
}
