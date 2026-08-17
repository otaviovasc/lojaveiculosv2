import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmRoutingConnection } from "../../ports/crmRoutingConnectionRepository.js";
import type {
  CrmChannelRoutingPolicy,
  CrmRoutingPolicyRepository,
} from "../../ports/crmRoutingPolicyRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getCrmRoutingPolicy } from "./getCrmRoutingPolicy.js";
import { ensureFirstReadyChannelDefault } from "./ensureFirstReadyChannelDefault.js";

describe("ensureFirstReadyChannelDefault", () => {
  it("persists the first ready route instead of using a runtime fallback", async () => {
    const selected = connection("zapi", "first-ready");
    const servicePorts = ports([selected], []);

    await expect(
      ensureFirstReadyChannelDefault(
        context(),
        { channel: "whatsapp", connectionId: selected.id },
        servicePorts,
      ),
    ).resolves.toBe(true);

    const result = await getCrmRoutingPolicy(context(), servicePorts);
    expect(
      result.channels.find((item) => item.channel === "whatsapp")?.storeDefault,
    ).toMatchObject({ connection: { id: selected.id }, ready: true });
  });

  it("does not choose among multiple ready routes or replace a default", async () => {
    const first = connection("zapi", "first");
    const second = connection("meta_cloud", "second");
    await expect(
      ensureFirstReadyChannelDefault(
        context(),
        { channel: "whatsapp", connectionId: first.id },
        ports([first, second], []),
      ),
    ).resolves.toBe(false);

    const explicit = ports([first], [policy("chosen")]);
    await expect(
      ensureFirstReadyChannelDefault(
        context(),
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
  });

  it("does not overwrite an explicit default saved between read and write", async () => {
    const first = connection("zapi", "first-ready");
    const servicePorts = ports([first], [], (policies) => {
      policies.push(policy("explicit-winner"));
    });

    await expect(
      ensureFirstReadyChannelDefault(
        context(),
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
  });
});

function context() {
  return createServiceContext({
    actor: { id: "actor-1", kind: "user" },
    entitlements: ["crm"],
    permissions: [
      "crm.messaging.connection.setup",
      "crm.routing.default.manage",
      "crm.whatsapp.list",
    ],
    request: { requestId: "request-1" },
    ...scope(),
  });
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
    botConnectionId: null,
    botMode: "disabled",
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
      synchronizeLegacyConnections: async () => undefined,
      verifyLegacyMappings: async (input) => input.connectionIds,
    },
    crmRoutingPolicyRepository: policyRepository,
  };
  result.transaction = async (action) => action(result);
  return result;
}
