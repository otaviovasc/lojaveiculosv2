import type { Hono } from "hono";
import type { ReadinessResult } from "../runtime/readiness.js";

export const crmApiContractVersion = "crm-lead-session-v1";

export function installHealthRoutes(
  app: Hono,
  readiness?: () => Promise<ReadinessResult>,
): void {
  app.get("/health", (context) =>
    context.json({
      build: {
        commitSha: readBuildCommitSha(),
        crmApiContractVersion,
      },
      ok: true,
    }),
  );
  app.get("/ready", async (context) => {
    const result = readiness
      ? await readiness()
      : { checks: { runtime: "ready" as const }, ok: true };
    return context.json(result, result.ok ? 200 : 503);
  });
}

function readBuildCommitSha() {
  return (
    process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ||
    process.env.BUILD_COMMIT_SHA?.trim() ||
    "unknown"
  );
}
