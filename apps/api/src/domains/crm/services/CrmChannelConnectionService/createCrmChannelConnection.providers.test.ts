import { describe, expect, it } from "vitest";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { CrmChannelConnectionProviderAlreadyExistsError } from "../../channelConnections/connectionCreation.js";
import {
  createContext,
  createPorts,
  storeId,
  tenantId,
} from "../../testSupportCrmChannelConnectionCreation.js";
import { createCrmChannelConnection } from "./createCrmChannelConnection.js";

describe("createCrmChannelConnection provider rules", () => {
  it("does not apply Z-API connection identity rules to official WhatsApp", async () => {
    const ports = createPorts(0);

    await expect(
      createCrmChannelConnection(
        createContext(),
        {
          channel: "whatsapp",
          displayName: "Atendimento",
          provider: "meta_cloud",
        },
        ports,
      ),
    ).resolves.toMatchObject({
      broker: "composio",
      capabilities: [
        "inbound",
        "outbound",
        "text",
        "media",
        "templates",
        "conversation_start",
      ],
      channel: "whatsapp",
      provider: "meta_cloud",
    });
    expect(
      await ports.crmConnectionRepository?.listConnections({
        storeId: storeId as never,
        tenantId: tenantId as never,
      }),
    ).toHaveLength(1);
  });

  it("creates an Instagram sandbox with the CRM entitlement", async () => {
    const ports = createPorts(0);

    await expect(
      createCrmChannelConnection(
        createContext(),
        {
          channel: "instagram",
          displayName: "Instagram",
          provider: "meta_cloud",
        },
        ports,
      ),
    ).resolves.toMatchObject({
      broker: "composio",
      capabilities: ["inbound", "outbound", "text", "media"],
      channel: "instagram",
      provider: "meta_cloud",
      status: "sandbox",
    });
  });

  it("rejects a second non-archived Instagram connection", async () => {
    const ports = createPorts(0);
    await createCrmChannelConnection(
      createContext(),
      {
        channel: "instagram",
        displayName: "Instagram principal",
        provider: "meta_cloud",
      },
      ports,
    );
    await expect(
      createCrmChannelConnection(
        createContext(),
        {
          channel: "instagram",
          displayName: "Instagram duplicado",
          provider: "meta_cloud",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(CrmChannelConnectionProviderAlreadyExistsError);
  });

  it("requires the CRM entitlement for Official WhatsApp", async () => {
    await expect(
      createCrmChannelConnection(
        createContext(undefined, []),
        {
          channel: "whatsapp",
          displayName: "Atendimento",
          provider: "meta_cloud",
        },
        createPorts(0),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
