import type { Hono } from "hono";
import type { ReadinessResult } from "../runtime/readiness.js";

export function installHealthRoutes(
  app: Hono,
  readiness?: () => Promise<ReadinessResult>,
): void {
  app.get("/health", (context) => context.json({ ok: true }));
  app.get("/ready", async (context) => {
    const result = readiness
      ? await readiness()
      : { checks: { runtime: "ready" as const }, ok: true };
    return context.json(result, result.ok ? 200 : 503);
  });
}
