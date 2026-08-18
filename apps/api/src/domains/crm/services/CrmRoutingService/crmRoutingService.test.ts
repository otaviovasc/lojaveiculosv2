import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmRoutingConnection } from "../../ports/crmRoutingConnectionRepository.js";
import type {
  CrmChannelRoutingPolicy,
  CrmRoutingPolicyRepository,
} from "../../ports/crmRoutingPolicyRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getCrmRoutingPolicy } from "./getCrmRoutingPolicy.js";
import { updateCrmRoutingPolicy } from "./updateCrmRoutingPolicy.js";

describe("CRM channel routing service", () => {
  it("resolves store defaults and inherited bot routes for every channel", async () => {
    const connections = [
      connection("whatsapp", "zapi", "wa"),
      connection("instagram", "meta_cloud", "ig"),
      connection("olx_chat", "olx", "olx"),
    ];
    const policies = connections.map((item) => policy(item.channel, item.id));
    const result = await getCrmRoutingPolicy(
      context(["crm.whatsapp.list"]),
      ports(connections, policies),
    );
    expect(result.channels).toHaveLength(3);
    expect(result.channels.every((channel) => channel.storeDefault.ready)).toBe(
      true,
    );
    expect(result.channels.every((channel) => channel.bot.ready)).toBe(true);
  });

  it("returns an actionable blocked state without falling back", async () => {
    const paused = {
      ...connection("whatsapp", "zapi", "wa"),
      state: "paused",
    } as const;
    const result = await getCrmRoutingPolicy(
      context(["crm.whatsapp.list"]),
      ports([paused], [policy("whatsapp", paused.id)]),
    );
    const whatsapp = result.channels.find(
      (channel) => channel.channel === "whatsapp",
    );
    expect(whatsapp?.storeDefault).toMatchObject({
      blocked: {
        code: "connection_inactive",
        remediation:
          "Reconnect or activate the provider connection after repairing it.",
      },
      connection: { id: paused.id },
      ready: false,
    });
  });

  it("rejects channel-incompatible and cross-scope selections", async () => {
    const instagram = connection("instagram", "meta_cloud", "ig");
    await expect(
      updateCrmRoutingPolicy(
        context(["crm.routing.default.manage"]),
        {
          bot: { mode: "disabled" },
          channel: "whatsapp",
          defaultConnectionId: instagram.id,
        },
        ports([instagram], []),
      ),
    ).rejects.toMatchObject({ reason: "channel_incompatible" });

    const foreign = {
      ...connection("whatsapp", "zapi", "foreign"),
      storeId: "other-store" as never,
    };
    await expect(
      updateCrmRoutingPolicy(
        context(["crm.routing.default.manage"]),
        {
          bot: { mode: "disabled" },
          channel: "whatsapp",
          defaultConnectionId: foreign.id,
        },
        ports([foreign], []),
      ),
    ).rejects.toMatchObject({ reason: "scope_mismatch" });
  });

  it("persists explicit bot routing through the transaction seam", async () => {
    const defaultConnection = connection("whatsapp", "zapi", "default");
    const botConnection = connection("whatsapp", "zapi", "bot");
    const transaction = vi.fn(
      async (action: (transactionPorts: CrmServicePorts) => Promise<unknown>) =>
        action(servicePorts),
    );
    const servicePorts = ports([defaultConnection, botConnection], []);
    servicePorts.transaction = transaction as never;
    const result = await updateCrmRoutingPolicy(
      context(["crm.routing.default.manage"]),
      {
        bot: { connectionId: botConnection.id, mode: "explicit_connection" },
        channel: "whatsapp",
        defaultConnectionId: defaultConnection.id,
      },
      servicePorts,
    );
    expect(transaction).toHaveBeenCalledOnce();
    const whatsapp = result.channels.find(
      (channel) => channel.channel === "whatsapp",
    );
    expect(whatsapp?.bot).toMatchObject({
      connection: { id: botConnection.id },
      mode: "explicit_connection",
      ready: true,
    });
  });

  it("fails closed when the selected connection has no canonical row", async () => {
    await expect(
      updateCrmRoutingPolicy(
        context(["crm.routing.default.manage"]),
        {
          bot: { mode: "disabled" },
          channel: "whatsapp",
          defaultConnectionId: "legacy-only-connection",
        },
        ports([], []),
      ),
    ).rejects.toMatchObject({ reason: "connection_not_found" });
  });

  it("audits selected connections and resolved readiness", async () => {
    const selected = connection("whatsapp", "zapi", "audited");
    const records: Array<{
      metadata?: Record<string, unknown>;
      outcome: string;
    }> = [];
    const serviceContext = Object.assign(
      createServiceContext({
        actor: { id: "actor-1", kind: "user" },
        audit: { record: async (event) => void records.push(event as never) },
        permissions: ["crm.routing.default.manage"],
        request: { requestId: "request-1" },
        storeId: "store-1",
        tenantId: "tenant-1",
      }),
      { entitlements: ["crm"] as const },
    );
    await updateCrmRoutingPolicy(
      serviceContext,
      {
        bot: { mode: "inherit_store_default" },
        channel: "whatsapp",
        defaultConnectionId: selected.id,
      },
      ports([selected], []),
    );
    const succeeded = records.find((record) => record.outcome === "succeeded");
    expect(succeeded?.metadata).toMatchObject({
      botReady: true,
      defaultConnectionId: selected.id,
      storeDefaultReady: true,
    });
  });
});

function context(permissions: string[]) {
  return Object.assign(
    createServiceContext({
      actor: { id: "actor-1", kind: "user" },
      permissions,
      request: { requestId: "request-1" },
      storeId: "store-1",
      tenantId: "tenant-1",
    }),
    { entitlements: ["crm"] as const },
  );
}

function connection(
  channel: CrmRoutingConnection["channel"],
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
    channel,
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

function policy(
  channel: CrmChannelRoutingPolicy["channel"],
  connectionId: string,
): CrmChannelRoutingPolicy {
  return {
    botConnectionId: null,
    botMode: "inherit_store_default",
    channel,
    defaultConnectionId: connectionId,
    id: `policy-${channel}`,
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
  };
}

function ports(
  connections: readonly CrmRoutingConnection[],
  initialPolicies: readonly CrmChannelRoutingPolicy[],
): CrmServicePorts {
  const policies = [...initialPolicies];
  const policyRepository: CrmRoutingPolicyRepository = {
    createDefaultIfMissing: async () => null,
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
  return {
    crmRepository: {} as never,
    crmRoutingConnectionRepository: {
      listConnections: async () => connections,
    },
    crmRoutingPolicyRepository: policyRepository,
  };
}
