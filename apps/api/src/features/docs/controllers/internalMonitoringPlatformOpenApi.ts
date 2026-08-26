import { internalMonitoringPaths } from "./internalMonitoringOpenApi.js";

const scopedHealthGet = internalMonitoringPaths["/api/v1/internal/health"].get;

export const internalMonitoringPlatformPaths = {
  "/api/v1/internal/platform/health": {
    get: {
      ...scopedHealthGet,
      summary: "Read platform observability snapshot",
      description:
        "Returns the platform-wide audit and log projection only when the authenticated account has an active, non-delegable platform-administrator authority and audit.read. Store roles, agency roles, and audit.read alone do not grant access. The query contract is identical to scoped health, but no store or tenant filter is applied; safe metadata and request diagnostics remain the only exposed event context.",
      operationId: "getPlatformInternalHealthSnapshot",
      security: [{ bearerAuth: ["platformAdmin", "audit.read"] }],
      responses: {
        "200": {
          description: "Platform-wide audit health snapshot.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InternalHealthSnapshot" },
            },
          },
        },
      },
    },
  },
};
