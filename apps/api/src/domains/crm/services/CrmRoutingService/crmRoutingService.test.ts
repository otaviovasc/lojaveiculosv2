import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getCrmRoutingPolicy } from "./getCrmRoutingPolicy.js";
import { updateCrmRoutingPolicy } from "./updateCrmRoutingPolicy.js";
import {
  routingConnection,
  routingContext,
  routingPolicy,
  routingPorts,
} from "./crmRoutingService.testSupport.js";

describe("CRM channel routing service", () => {
  it("resolves store defaults and inherited bot routes for every channel", async () => {
    const connections = [
      routingConnection("whatsapp", "zapi", "wa"),
      routingConnection("instagram", "meta_cloud", "ig"),
      routingConnection("olx_chat", "olx", "olx"),
    ];
    const policies = connections.map((item) =>
      routingPolicy(item.channel, item.id),
    );
    const result = await getCrmRoutingPolicy(
      routingContext(["crm.conversations.read"]),
      routingPorts(connections, policies),
    );
    expect(result.channels).toHaveLength(3);
    expect(result.channels.every((channel) => channel.storeDefault.ready)).toBe(
      true,
    );
    expect(result.channels.every((channel) => channel.bot.ready)).toBe(true);
  });

  it("returns an actionable blocked state without falling back", async () => {
    const paused = {
      ...routingConnection("whatsapp", "zapi", "wa"),
      state: "paused",
    } as const;
    const result = await getCrmRoutingPolicy(
      routingContext(["crm.conversations.read"]),
      routingPorts([paused], [routingPolicy("whatsapp", paused.id)]),
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
    const instagram = routingConnection("instagram", "meta_cloud", "ig");
    await expect(
      updateCrmRoutingPolicy(
        routingContext(["crm.routing.default.manage"]),
        {
          bot: { mode: "disabled" },
          channel: "whatsapp",
          defaultConnectionId: instagram.id,
        },
        routingPorts([instagram], []),
      ),
    ).rejects.toMatchObject({ reason: "channel_incompatible" });

    const foreign = {
      ...routingConnection("whatsapp", "zapi", "foreign"),
      storeId: "other-store" as never,
    };
    await expect(
      updateCrmRoutingPolicy(
        routingContext(["crm.routing.default.manage"]),
        {
          bot: { mode: "disabled" },
          channel: "whatsapp",
          defaultConnectionId: foreign.id,
        },
        routingPorts([foreign], []),
      ),
    ).rejects.toMatchObject({ reason: "scope_mismatch" });
  });

  it("persists explicit bot routing through the transaction seam", async () => {
    const defaultConnection = routingConnection("whatsapp", "zapi", "default");
    const botConnection = routingConnection("whatsapp", "zapi", "bot");
    const transaction = vi.fn(
      async (action: (transactionPorts: CrmServicePorts) => Promise<unknown>) =>
        action(servicePorts),
    );
    const servicePorts = routingPorts([defaultConnection, botConnection], []);
    servicePorts.transaction = transaction as never;
    const result = await updateCrmRoutingPolicy(
      routingContext(["crm.routing.default.manage"]),
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
        routingContext(["crm.routing.default.manage"]),
        {
          bot: { mode: "disabled" },
          channel: "whatsapp",
          defaultConnectionId: "legacy-only-connection",
        },
        routingPorts([], []),
      ),
    ).rejects.toMatchObject({ reason: "connection_not_found" });
  });

  it("audits selected connections and resolved readiness", async () => {
    const selected = routingConnection("whatsapp", "zapi", "audited");
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
      routingPorts([selected], []),
    );
    const succeeded = records.find((record) => record.outcome === "succeeded");
    expect(succeeded?.metadata).toMatchObject({
      botReady: true,
      defaultConnectionId: selected.id,
      storeDefaultReady: true,
    });
  });
});
