const timestamp = { type: "string", format: "date-time" } as const;
const status = {
  type: "string",
  enum: ["awaiting_approval", "approved", "rejected", "cancelled"],
} as const;
const runSummaryRequired = [
  "id",
  "objective",
  "status",
  "version",
  "executionEnabled",
  "createdByActorId",
  "stepCount",
  "pendingApprovalCount",
  "createdAt",
  "updatedAt",
] as const;
const runSummaryProperties = {
  createdAt: timestamp,
  createdByActorId: { type: "string" },
  executionEnabled: { type: "boolean", const: false },
  id: { type: "string", format: "uuid" },
  objective: { type: "string" },
  pendingApprovalCount: { type: "integer", minimum: 0 },
  status,
  stepCount: { type: "integer", minimum: 0 },
  updatedAt: timestamp,
  version: { type: "integer", minimum: 1 },
} as const;

export const automationSchemas = {
  AutomationApproval: {
    type: "object",
    additionalProperties: false,
    required: [
      "id",
      "status",
      "version",
      "proposalDigest",
      "createdAt",
      "updatedAt",
      "decidedAt",
      "decidedByActorId",
    ],
    properties: {
      createdAt: timestamp,
      decidedAt: { oneOf: [timestamp, { type: "null" }] },
      decidedByActorId: { type: ["string", "null"] },
      id: { type: "string", format: "uuid" },
      proposalDigest: { type: "string", pattern: "^[a-f0-9]{64}$" },
      status: {
        type: "string",
        enum: ["pending", "approved", "rejected", "cancelled"],
      },
      updatedAt: timestamp,
      version: { type: "integer", minimum: 1 },
    },
  },
  AutomationStep: {
    type: "object",
    additionalProperties: false,
    required: [
      "id",
      "position",
      "kind",
      "title",
      "summary",
      "risk",
      "status",
      "version",
      "executionEnabled",
      "approval",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      approval: {
        oneOf: [
          { $ref: "#/components/schemas/AutomationApproval" },
          { type: "null" },
        ],
      },
      createdAt: timestamp,
      executionEnabled: { type: "boolean", const: false },
      id: { type: "string", format: "uuid" },
      kind: { type: "string", enum: ["read_only_preview"] },
      position: { type: "integer", minimum: 1 },
      risk: { type: "string", enum: ["low"] },
      status,
      summary: { type: "string" },
      title: { type: "string" },
      updatedAt: timestamp,
      version: { type: "integer", minimum: 1 },
    },
  },
  AutomationRunSummary: {
    type: "object",
    additionalProperties: false,
    required: runSummaryRequired,
    properties: runSummaryProperties,
  },
  AutomationRun: {
    type: "object",
    additionalProperties: false,
    required: [...runSummaryRequired, "context", "steps"],
    properties: {
      ...runSummaryProperties,
      context: {
        type: "object",
        additionalProperties: false,
        properties: {
          module: { type: "string" },
          resourceId: { type: "string" },
        },
      },
      steps: {
        type: "array",
        items: { $ref: "#/components/schemas/AutomationStep" },
      },
    },
  },
  AutomationRunResponse: {
    type: "object",
    additionalProperties: false,
    required: ["data"],
    properties: { data: { $ref: "#/components/schemas/AutomationRun" } },
  },
  AutomationRunListResponse: {
    type: "object",
    additionalProperties: false,
    required: ["data", "meta"],
    properties: {
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/AutomationRunSummary" },
      },
      meta: {
        type: "object",
        additionalProperties: false,
        required: ["limit", "offset", "total"],
        properties: {
          limit: { type: "integer" },
          offset: { type: "integer" },
          total: { type: "integer" },
        },
      },
    },
  },
  CreateAutomationPreviewRequest: {
    type: "object",
    additionalProperties: false,
    required: ["objective"],
    properties: {
      context: {
        type: "object",
        additionalProperties: false,
        properties: {
          module: { type: "string", maxLength: 120 },
          resourceId: { type: "string", maxLength: 191 },
        },
      },
      objective: { type: "string", minLength: 3, maxLength: 2000 },
    },
  },
  CancelAutomationRunRequest: versionProperties(["expectedRunVersion"]),
  DecideAutomationStepRequest: {
    ...versionProperties([
      "expectedRunVersion",
      "expectedStepVersion",
      "expectedApprovalVersion",
    ]),
    required: [
      "expectedRunVersion",
      "expectedStepVersion",
      "expectedApprovalVersion",
      "expectedProposalDigest",
    ],
    properties: {
      expectedApprovalVersion: { type: "integer", minimum: 1 },
      expectedProposalDigest: {
        type: "string",
        pattern: "^[a-f0-9]{64}$",
      },
      expectedRunVersion: { type: "integer", minimum: 1 },
      expectedStepVersion: { type: "integer", minimum: 1 },
    },
  },
} as const;

function versionProperties(required: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties: {
      expectedRunVersion: { type: "integer", minimum: 1 },
    },
  } as const;
}
