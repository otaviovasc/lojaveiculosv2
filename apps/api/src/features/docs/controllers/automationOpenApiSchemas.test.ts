import { describe, expect, it } from "vitest";
import type { AutomationRun } from "../../../domains/automation/models.js";
import { automationRunResponse } from "../../automation/controllers/automationResponseDtos.js";
import { automationSchemas } from "./automationOpenApiSchemas.js";

describe("automation OpenAPI schemas", () => {
  it("declares the detail DTO as one satisfiable closed JSON Schema object", () => {
    const schema = automationSchemas.AutomationRun;
    const responseKeys = Object.keys(
      automationRunResponse(automationRunFixture()).data,
    ).sort();

    // JSON Schema evaluates additionalProperties in the schema object where it
    // appears. Extending a closed summary through allOf rejects context/steps.
    expect("allOf" in schema).toBe(false);
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
    expect(Object.keys(schema.properties).sort()).toEqual(responseKeys);
    expect([...schema.required].sort()).toEqual(responseKeys);
    for (const requiredProperty of schema.required) {
      expect(schema.properties).toHaveProperty(requiredProperty);
    }
  });

  it("uses valid HTTP bearer security and separate permission metadata", async () => {
    const { automationPaths } = await import("./automationOpenApi.js");
    const operations = [
      automationPaths["/api/v1/automation/runs"].get,
      automationPaths["/api/v1/automation/runs"].post,
      automationPaths["/api/v1/automation/runs/{runId}"].get,
      automationPaths["/api/v1/automation/runs/{runId}/cancel"].post,
      automationPaths["/api/v1/automation/runs/{runId}/steps/{stepId}/approve"]
        .post,
      automationPaths["/api/v1/automation/runs/{runId}/steps/{stepId}/reject"]
        .post,
    ];

    for (const operation of operations) {
      expect(operation.security).toEqual([{ bearerAuth: [] }]);
      expect(operation["x-required-permissions"]).toEqual([
        expect.stringMatching(/^automation\./),
      ]);
    }
  });
});

function automationRunFixture(): AutomationRun {
  const now = new Date("2026-07-11T12:00:00.000Z");
  return {
    context: { module: "inventory", resourceId: "vehicle_1" },
    createdAt: now,
    createdByActorId: "user_1",
    executionEnabled: false,
    id: "10000000-0000-4000-8000-000000000001",
    objective: "Review vehicle readiness",
    status: "awaiting_approval",
    steps: [
      {
        approval: {
          createdAt: now,
          decidedAt: null,
          decidedByActorId: null,
          id: "10000000-0000-4000-8000-000000000003",
          proposalDigest: "a".repeat(64),
          status: "pending",
          updatedAt: now,
          version: 1,
        },
        createdAt: now,
        executionEnabled: false,
        id: "10000000-0000-4000-8000-000000000002",
        kind: "read_only_preview",
        position: 1,
        risk: "low",
        status: "awaiting_approval",
        summary: "Read-only preview",
        title: "Review preview",
        updatedAt: now,
        version: 1,
      },
    ],
    storeId: "20000000-0000-4000-8000-000000000001" as never,
    tenantId: "30000000-0000-4000-8000-000000000001" as never,
    updatedAt: now,
    version: 1,
  };
}
