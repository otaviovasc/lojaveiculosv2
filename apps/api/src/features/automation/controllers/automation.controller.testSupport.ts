import { Hono } from "hono";
import { createMemoryAuditSink } from "@lojaveiculosv2/audit";
import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import {
  createServiceContext,
  type ActorKind,
  type StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
import { createMemoryAutomationRunRepository } from "../adapters/memory/automationRunRepository.js";
import { createAutomationFeature } from "./automation.controller.js";
import { createAutomationServices } from "./automationServices.js";

const allPermissions = [
  "automation.read",
  "automation.run",
  "automation.cancel",
  "automation.approve",
] satisfies PermissionKey[];

export function createAutomationTestApp(
  options: {
    actorKind?: ActorKind;
    entitlements?: EntitlementKey[];
    permissions?: PermissionKey[];
  } = {},
) {
  const app = new Hono();
  const audit = createMemoryAuditSink();
  const services = createAutomationServices(
    createMemoryAutomationRunRepository(),
  );
  app.route(
    "/api/v1/automation",
    createAutomationFeature({
      services,
      contextFactory: async (httpContext) => {
        const storeId = httpContext.req.header("x-test-store") ?? "store_1";
        const context = createServiceContext({
          actor: {
            id: "user_1",
            kind: options.actorKind ?? "user",
          },
          audit,
          permissions: options.permissions ?? allPermissions,
          request: { requestId: "req_automation_test" },
          storeId,
          tenantId: "tenant_1",
        });
        return {
          ...context,
          entitlements: options.entitlements ?? ["automation"],
          storeId,
          tenantId: "tenant_1",
        } as StoreScopedServiceContext;
      },
    }),
  );
  return { app, audit };
}

export async function createPreview(
  app: Hono,
  options: { objective?: string; storeId?: string } = {},
) {
  const response = await app.request("/api/v1/automation/runs", {
    body: JSON.stringify({
      context: { module: "inventory", resourceId: "vehicle_1" },
      objective: options.objective ?? "Review inventory readiness",
    }),
    headers: {
      "content-type": "application/json",
      ...(options.storeId ? { "x-test-store": options.storeId } : {}),
    },
    method: "POST",
  });
  return { response, body: (await response.json()) as AutomationResponse };
}

export type AutomationResponse = {
  code?: string;
  data: {
    executionEnabled: false;
    id: string;
    objective: string;
    pendingApprovalCount: number;
    status: string;
    stepCount: number;
    steps: Array<{
      approval: {
        decidedByActorId: string | null;
        proposalDigest: string;
        status: string;
        version: number;
      };
      executionEnabled: false;
      id: string;
      kind: string;
      status: string;
      version: number;
    }>;
    version: number;
  };
};
