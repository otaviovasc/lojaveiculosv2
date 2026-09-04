import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import { expect, vi } from "vitest";
import { toCanonicalRoutingConnection } from "../../../domains/crm/ports/crmChannelConnectionProjection.js";
import type { CrmRoutingConnectionRepository } from "../../../domains/crm/ports/crmRoutingConnectionRepository.js";
import type { CrmRoutingPolicyRepository } from "../../../domains/crm/ports/crmRoutingPolicyRepository.js";
import type { CreateCrmTestAppOptions } from "./crm.controller.testSupport.types.js";

export function createTestRoutingConnectionRepository(
  connectionRepository: CreateCrmTestAppOptions["crmConnectionRepository"],
): CrmRoutingConnectionRepository | undefined {
  if (!connectionRepository) return undefined;
  return {
    async listConnections(scope) {
      const connections = await connectionRepository.listConnections(scope);
      return connections.map(toCanonicalRoutingConnection);
    },
  };
}

export function createTestRoutingPolicyRepository(
  connectionRepository: CrmRoutingConnectionRepository | undefined,
): CrmRoutingPolicyRepository | undefined {
  if (!connectionRepository) return undefined;
  const policies = new Map<
    string,
    Awaited<ReturnType<CrmRoutingPolicyRepository["upsertPolicy"]>>
  >();
  return {
    async createDefaultIfMissing(input) {
      const key = `${input.tenantId}:${input.storeId}:${input.channel}`;
      const existing = policies.get(key);
      if (existing?.defaultConnectionId) return null;
      const connections = await connectionRepository.listConnections(input);
      const policy = existing ?? { ...input, id: crypto.randomUUID() };
      policy.defaultConnectionId ??=
        connections.find((connection) => connection.channel === input.channel)
          ?.id ?? null;
      policies.set(key, policy);
      return policy;
    },
    async listPolicies(scope) {
      const connections = await connectionRepository.listConnections(scope);
      for (const connection of connections) {
        const key = `${scope.tenantId}:${scope.storeId}:${connection.channel}`;
        if (!policies.has(key)) {
          policies.set(key, {
            channel: connection.channel,
            defaultConnectionId: connection.id,
            externalBotConnectionId: null,
            externalBotMode: "disabled",
            id: crypto.randomUUID(),
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
        }
      }
      return [...policies.values()].filter(
        (policy) =>
          policy.storeId === scope.storeId &&
          policy.tenantId === scope.tenantId,
      );
    },
    async upsertPolicy(input) {
      const key = `${input.tenantId}:${input.storeId}:${input.channel}`;
      const policy = {
        ...input,
        id: policies.get(key)?.id ?? crypto.randomUUID(),
      };
      policies.set(key, policy);
      return policy;
    },
  };
}

export function createAuditSpy() {
  const record = vi.fn(async (_event: AuditEvent) => undefined);
  const audit: AuditSink = {
    record: async (event) => {
      await record(event);
    },
  };
  return { audit, record };
}

export async function expectApiError(
  response: Response,
  input: { code: string; message: string },
) {
  const body = (await response.json()) as {
    code?: string;
    message?: string;
    requestId?: unknown;
  };
  expect(body).toMatchObject({ code: input.code, message: input.message });
  expect(typeof body.requestId).toBe("string");
}
