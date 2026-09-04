import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { CrmChannelConnectionProviderAlreadyExistsError } from "../../channelConnections/connectionCreation.js";
import { createTestCrmConnectionMemberRepository } from "../../testSupportConnectionMembers.js";
import {
  createContext,
  createPorts,
  storeId,
  tenantId,
} from "../../testSupportCrmChannelConnectionCreation.js";
import { createCrmChannelConnection } from "./createCrmChannelConnection.js";

describe("createCrmChannelConnection provider rules", () => {
  it("warns instead of silently skipping when the member repository port is missing", async () => {
    const warn = vi.fn();
    const context = {
      ...createContext(),
      logger: { error: vi.fn(), info: vi.fn(), warn },
    };

    const connection = await createCrmChannelConnection(
      context,
      {
        channel: "whatsapp",
        clientToken: "client-secret",
        displayName: "Atendimento",
        instanceId: "instance_1",
        instanceToken: "raw-secret",
        provider: "zapi",
      },
      createPorts(),
    );

    expect(connection.provider).toBe("zapi");
    expect(warn).toHaveBeenCalledWith(
      "crm.connection.member.creator_grant.skipped",
      expect.objectContaining({
        connectionId: connection.id,
        reason: "missing_crm_connection_member_repository",
      }),
    );
  });

  it("does not apply Z-API connection identity rules to official WhatsApp", async () => {
    const members = createTestCrmConnectionMemberRepository();
    const ports = createPorts(0, undefined, members.repository);

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
    // Official WhatsApp (composio broker) is globally visible; no membership grant.
    expect(members.grants).toHaveLength(0);
  });

  it("creates an Instagram sandbox with the CRM entitlement", async () => {
    const members = createTestCrmConnectionMemberRepository();
    const ports = createPorts(0, undefined, members.repository);

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
    expect(members.grants).toHaveLength(0);
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
