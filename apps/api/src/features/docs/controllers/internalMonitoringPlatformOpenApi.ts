import { internalMonitoringPaths } from "./internalMonitoringOpenApi.js";

const scopedHealthGet = internalMonitoringPaths["/api/v1/internal/health"].get;

export const internalMonitoringPlatformPaths = {
  "/api/v1/internal/platform/health": {
    get: {
      ...scopedHealthGet,
      summary: "Read platform observability snapshot",
      description:
        "Returns the platform-wide audit and log projection for platform administrators. The query contract is identical to scoped health, but no store or tenant filter is applied; safe metadata and request diagnostics remain the only exposed event context.",
      operationId: "getPlatformInternalHealthSnapshot",
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
