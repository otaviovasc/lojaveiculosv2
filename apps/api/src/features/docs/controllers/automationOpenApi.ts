export { automationSchemas } from "./automationOpenApiSchemas.js";

const protectedOperation = (permission: string) => ({
  security: [{ bearerAuth: [] }],
  "x-required-permissions": [permission],
});
const runParameter = {
  in: "path",
  name: "runId",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;
const stepParameter = {
  in: "path",
  name: "stepId",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;
const runResponse = {
  description: "Current automation run and its preview approval state.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/AutomationRunResponse" },
    },
  },
} as const;

export const automationPaths = {
  "/api/v1/automation/runs": {
    get: {
      tags: ["Automation"],
      summary: "List store automation previews",
      operationId: "listAutomationRuns",
      ...protectedOperation("automation.read"),
      parameters: [
        queryParameter("limit", 25, 1, 100),
        queryParameter("offset", 0, 0, 10_000),
      ],
      responses: {
        "200": {
          description: "Paginated workspace list, newest first.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AutomationRunListResponse",
              },
            },
          },
        },
        "403": errorResponse(
          "Missing automation entitlement or read permission.",
        ),
      },
    },
    post: {
      tags: ["Automation"],
      summary: "Create a deterministic read-only automation preview",
      operationId: "createAutomationPreviewRun",
      ...protectedOperation("automation.run"),
      requestBody: body("CreateAutomationPreviewRequest"),
      responses: {
        "201": runResponse,
        "400": errorResponse("Invalid objective or preview context."),
        "403": errorResponse(
          "Missing automation entitlement or run permission.",
        ),
      },
    },
  },
  "/api/v1/automation/runs/{runId}": {
    get: {
      tags: ["Automation"],
      summary: "Read one scoped automation preview",
      operationId: "getAutomationRun",
      ...protectedOperation("automation.read"),
      parameters: [runParameter],
      responses: {
        "200": runResponse,
        "404": errorResponse("Run not found in the current store scope."),
      },
    },
  },
  "/api/v1/automation/runs/{runId}/cancel": {
    post: {
      tags: ["Automation"],
      summary: "Cancel a pending automation preview",
      operationId: "cancelAutomationRun",
      ...protectedOperation("automation.cancel"),
      parameters: [runParameter],
      requestBody: body("CancelAutomationRunRequest"),
      responses: {
        "200": runResponse,
        "404": errorResponse("Run not found in the current store scope."),
        "409": errorResponse("Stale version or terminal run state."),
      },
    },
  },
  "/api/v1/automation/runs/{runId}/steps/{stepId}/approve": decisionPath(
    "approveAutomationStep",
    "Approve the exact read-only preview",
  ),
  "/api/v1/automation/runs/{runId}/steps/{stepId}/reject": decisionPath(
    "rejectAutomationStep",
    "Reject the exact read-only preview",
  ),
} as const;

function decisionPath(operationId: string, summary: string) {
  return {
    post: {
      tags: ["Automation"],
      summary,
      operationId,
      ...protectedOperation("automation.approve"),
      parameters: [runParameter, stepParameter],
      requestBody: body("DecideAutomationStepRequest"),
      responses: {
        "200": runResponse,
        "404": errorResponse("Run, step, or approval not found."),
        "409": errorResponse(
          "Stale versions, proposal digest mismatch, or terminal state.",
        ),
      },
    },
  } as const;
}

function body(schemaName: string) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  } as const;
}

function errorResponse(description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiError" },
      },
    },
  } as const;
}

function queryParameter(
  name: string,
  defaultValue: number,
  minimum: number,
  maximum: number,
) {
  return {
    in: "query",
    name,
    required: false,
    schema: {
      type: "integer",
      default: defaultValue,
      minimum,
      maximum,
    },
  } as const;
}
