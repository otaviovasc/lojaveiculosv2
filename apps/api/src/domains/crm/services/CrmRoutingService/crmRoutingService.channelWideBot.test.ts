import { describe, expect, it } from "vitest";
import { getCrmRoutingPolicy } from "./getCrmRoutingPolicy.js";
import { updateCrmRoutingPolicy } from "./updateCrmRoutingPolicy.js";
import {
  routingConnection,
  routingContext,
  routingPolicy,
  routingPorts,
} from "./crmRoutingService.testSupport.js";

describe("CRM channel-wide external bot routing", () => {
  it("resolves the channel-wide bot mode from any routable channel connection", async () => {
    const paused = {
      ...routingConnection("whatsapp", "zapi", "paused"),
      state: "paused",
    } as const;
    const active = routingConnection("whatsapp", "zapi", "active");
    const channelPolicy = {
      ...routingPolicy("whatsapp", paused.id),
      externalBotMode: "all_channel_connections",
    } as const;
    const result = await getCrmRoutingPolicy(
      routingContext(["crm.conversations.read"]),
      routingPorts([paused, active], [channelPolicy]),
    );
    const whatsapp = result.channels.find(
      (channel) => channel.channel === "whatsapp",
    );
    expect(whatsapp?.bot).toMatchObject({
      blocked: null,
      connection: null,
      mode: "all_channel_connections",
      ready: true,
    });
  });

  it("blocks the channel-wide bot mode when no channel connection is routable", async () => {
    const paused = {
      ...routingConnection("whatsapp", "zapi", "paused"),
      state: "paused",
    } as const;
    const channelPolicy = {
      ...routingPolicy("whatsapp", paused.id),
      externalBotMode: "all_channel_connections",
    } as const;
    const result = await getCrmRoutingPolicy(
      routingContext(["crm.conversations.read"]),
      routingPorts([paused], [channelPolicy]),
    );
    const whatsapp = result.channels.find(
      (channel) => channel.channel === "whatsapp",
    );
    expect(whatsapp?.bot).toMatchObject({
      blocked: { code: "connection_inactive" },
      connection: null,
      mode: "all_channel_connections",
      ready: false,
    });
  });

  it("persists the channel-wide bot mode without a bot connection", async () => {
    const defaultConnection = routingConnection("whatsapp", "zapi", "default");
    const servicePorts = routingPorts([defaultConnection], []);
    const result = await updateCrmRoutingPolicy(
      routingContext(["crm.routing.default.manage"]),
      {
        bot: { mode: "all_channel_connections" },
        channel: "whatsapp",
        defaultConnectionId: defaultConnection.id,
      },
      servicePorts,
    );
    const persisted =
      await servicePorts.crmRoutingPolicyRepository?.listPolicies({
        storeId: "store-1",
        tenantId: "tenant-1",
      } as never);
    if (!persisted) throw new Error("routing policy repository missing");
    expect(persisted[0]).toMatchObject({
      externalBotConnectionId: null,
      externalBotMode: "all_channel_connections",
    });
    const whatsapp = result.channels.find(
      (channel) => channel.channel === "whatsapp",
    );
    expect(whatsapp?.bot).toMatchObject({
      mode: "all_channel_connections",
      ready: true,
    });
  });
});
