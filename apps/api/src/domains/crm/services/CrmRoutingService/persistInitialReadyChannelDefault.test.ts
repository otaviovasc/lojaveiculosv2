import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmRoutingConnection } from "../../ports/crmRoutingConnectionRepository.js";
import type {
  CrmChannelRoutingPolicy,
  CrmRoutingPolicyRepository,
} from "../../ports/crmRoutingPolicyRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getCrmRoutingPolicy } from "./getCrmRoutingPolicy.js";
import { persistInitialReadyChannelDefault } from "./persistInitialReadyChannelDefault.js";

describe("persistInitialReadyChannelDefault", () => {
  it("persists the initial ready route instead of using a runtime fallback", async () => {
    const selected = connection("zapi", "first-ready");
    const servicePorts = ports([selected], []);
    const audit = auditSpy();

    await expect(
      persistInitialReadyChannelDefault(
        context(audit.record),
        { channel: "whatsapp", connectionId: selected.id },
        servicePorts,
      ),
    ).resolves.toBe(true);

    const result = await getCrmRoutingPolicy(context(), servicePorts);
    expect(
      result.channels.find((item) => item.channel === "whatsapp")?.storeDefault,
    ).toMatchObject({ connection: { id: selected.id }, ready: true });
    expect(audit.events()).toMatchObject([
      { outcome: "attempted" },
      { metadata: { result: "created" }, outcome: "succeeded" },
    ]);
  });

  it("persists the candidate that first reports ready without array-order selection", async () => {
    const first = connection("zapi", "first");
    const second = connection("meta_cloud", "second");
    await expect(
      persistInitialReadyChannelDefault(
        context(),
        { channel: "whatsapp", connectionId: second.id },
        ports([first, second], []),
      ),
    ).resolves.toBe(true);

    const explicit = ports([first], [policy("chosen")]);

    const audit = auditSpy();
    await expect(
      persistInitialReadyChannelDefault(
        context(audit.record),
        { channel: "whatsapp", connectionId: first.id },
        explicit,
      ),
    ).resolves.toBe(false);
    expect(
      (
        await explicit.crmRoutingPolicyRepository!.listPolicies(
          scope() as never,
        )
      )[0]?.defaultConnectionId,
    ).toBe("chosen");
    expect(audit.events()).toMatchObject([
      { outcome: "attempted" },
      { metadata: { result: "already_present" }, outcome: "succeeded" },
    ]);
  });

  it("does not overwrite an explicit default saved between read and write", async () => {
    const first = connection("zapi", "first-ready");
    const servicePorts = ports([first], [], (policies) => {
      policies.push(policy("explicit-winner"));
    });
    const audit = auditSpy();

    await expect(
      persistInitialReadyChannelDefault(
        context(audit.record),
        { channel: "whatsapp", connectionId: first.id },
        servicePorts,
      ),
    ).resolves.toBe(false);
    expect(
      (
        await servicePorts.crmRoutingPolicyRepository!.listPolicies(
          scope() as never,
        )
      )[0]?.defaultConnectionId,
    ).toBe("explicit-winner");
    expect(audit.events()).toMatchObject([
      { outcome: "attempted" },
      { metadata: { result: "superseded" }, outcome: "succeeded" },
    ]);
  });

  it("records a failed terminal when automatic default persistence fails", async () => {
    const selected = connection("zapi", "first-ready");
    const servicePorts = ports([selected], []);
    servicePorts.crmRoutingConnectionRepository!.listConnections = async () => {
      throw new TypeError("routing persistence unavailable");
    };
    const audit = auditSpy();

    await expect(
      persistInitialReadyChannelDefault(
        context(audit.record),
        { channel: "whatsapp", connectionId: selected.id },
        servicePorts,
      ),
    ).rejects.toThrow("routing persistence unavailable");
    expect(audit.events()).toMatchObject([
      { outcome: "attempted" },
      {
        metadata: { errorName: "TypeError", result: "failed" },
        outcome: "failed",
      },
    ]);
  });
});

function context(record?: (event: AuditEvent) => Promise<void>) {
  return createServiceContext({
    actor: { id: "actor-1", kind: "user" },
    ...(record ? { audit: { record } } : {}),
    entitlements: ["crm"],
    permissions: ["crm.messaging.connection.setup", "crm.conversations.read"],
    request: { requestId: "request-1" },
    ...scope(),
  });
}

function auditSpy() {
  const record = vi.fn(async (_event: AuditEvent) => undefined);
  return {
    events: () => record.mock.calls.map(([event]) => event),
    record,
  };
}

function scope() {
  return { storeId: "store-1", tenantId: "tenant-1" } as const;
}

function connection(
  provider: CrmRoutingConnection["provider"],
  id: string,
): CrmRoutingConnection {
  return {
    capabilities: {
      inbound: true,
      outbound: true,
      scheduling: true,
      templates: false,
    },
    channel: "whatsapp",
    connected: true,
    credentialBroker: provider === "meta_cloud" ? "composio" : "direct",
    degraded: false,
    displayName: id,
    errorCode: null,
    id,
    provider,
    state: "active",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
  };
}

function policy(connectionId: string): CrmChannelRoutingPolicy {
  return {
    externalBotConnectionId: null,
    externalBotMode: "disabled",
    channel: "whatsapp",
    defaultConnectionId: connectionId,
    id: "policy-whatsapp",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
  };
}

function ports(
  connections: readonly CrmRoutingConnection[],
  initialPolicies: readonly CrmChannelRoutingPolicy[],
  beforeCreateDefault?: (policies: CrmChannelRoutingPolicy[]) => void,
): CrmServicePorts {
  const policies = [...initialPolicies];
  const policyRepository: CrmRoutingPolicyRepository = {
    createDefaultIfMissing: async (input) => {
      beforeCreateDefault?.(policies);
      const current = policies.find((item) => item.channel === input.channel);
      if (current?.defaultConnectionId) return null;
      if (current) {
        current.defaultConnectionId = input.defaultConnectionId;
        return current;
      }
      const created = { ...input, id: `policy-${input.channel}` };
      policies.push(created);
      return created;
    },
    listPolicies: async () => policies,
    upsertPolicy: async (input) => {
      const next = { ...input, id: `policy-${input.channel}` };
      const index = policies.findIndex(
        (item) => item.channel === input.channel,
      );
      if (index >= 0) policies[index] = next;
      else policies.push(next);
      return next;
    },
  };
  const result: CrmServicePorts = {
    crmRepository: {} as never,
    crmRoutingConnectionRepository: {
      listConnections: async () => connections,
    },
    crmRoutingPolicyRepository: policyRepository,
  };
  result.transaction = async (action) => action(result);
  return result;
}
