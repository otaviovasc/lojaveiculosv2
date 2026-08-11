import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import { OLX_ACCESS_TOKEN_CREDENTIAL_PURPOSE } from "../../domains/crm/ports/crmOlxCredentials.js";
import { CrmWhatsappCapabilityError } from "../../domains/crm/ports/crmWhatsappGateway.js";
import { createCrmConnectionCredentialVault } from "./crmConnectionCredentialVault.js";
import { createOlxCrmChatGateway } from "./olxCrmChatGateway.js";

const env = {
  CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY: "test-only-key",
};
let sealedAccessToken: string;

beforeAll(async () => {
  sealedAccessToken = await createCrmConnectionCredentialVault(env).seal({
    plaintext: "access-secret",
    purpose: OLX_ACCESS_TOKEN_CREDENTIAL_PURPOSE,
    storeId: "store_1" as StoreId,
    tenantId: "tenant_1" as TenantId,
  });
});

describe("OLX CRM chat gateway", () => {
  it("sends text with the connection-bound encrypted credential", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null));
    const gateway = createOlxCrmChatGateway(env, fetchImpl);

    const result = await gateway.sendText(createConnection(), {
      phone: "chat-1",
      text: "Tenho uma proposta",
    });
    const requestBody = JSON.parse(
      String(fetchImpl.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(result.externalId).toBe(requestBody.messageId);
    expect(requestBody.messageId).toEqual(expect.any(String));
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://apps.olx.com.br/autoservice/v1/chat/send",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(requestBody).toEqual({
      chatId: "chat-1",
      messageId: result.externalId,
      textMessage: "Tenho uma proposta",
    });
    const requestHeaders = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(requestHeaders.get("authorization")).toBe("Bearer access-secret");
  });

  it("rejects plaintext environment credential references", async () => {
    const connection = createConnection();
    connection.credentialsRef = {
      env: { accessToken: "REMOVED_PLAINTEXT_TOKEN" },
      mode: "env",
    };
    const gateway = createOlxCrmChatGateway(
      { ...env, REMOVED_PLAINTEXT_TOKEN: "plaintext-secret" },
      vi.fn() as typeof fetch,
    );

    await expect(
      gateway.sendText(connection, { phone: "chat-1", text: "Oi" }),
    ).rejects.toThrow("credential reference is not configured");
  });

  it("rejects plaintext stored access tokens", async () => {
    const connection = createConnection();
    connection.credentialsRef = {
      mode: "stored",
      stored: { accessToken: "plaintext-secret" },
    };
    const gateway = createOlxCrmChatGateway(env, vi.fn() as typeof fetch);

    await expect(
      gateway.sendText(connection, { phone: "chat-1", text: "Oi" }),
    ).rejects.toThrow("credential reference is not configured");
  });

  it("uses a unique client message id when OLX returns no documented body", async () => {
    const gateway = createOlxCrmChatGateway(
      env,
      vi.fn(async () => new Response(null, { status: 200 })) as typeof fetch,
    );
    const first = await sendText(gateway);
    const second = await sendText(gateway);

    expect(first.externalId).not.toBe(second.externalId);
  });

  it("rejects redirects instead of forwarding the OLX bearer credential", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, {
          headers: { location: "https://attacker.example.test/collect" },
          status: 307,
        }),
    );
    const gateway = createOlxCrmChatGateway(env, fetchImpl as typeof fetch);

    await expect(
      gateway.sendText(createConnection(), { phone: "chat-1", text: "Oi" }),
    ).rejects.toThrow("redirect");
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("rejects quoted replies before calling OLX", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const gateway = createOlxCrmChatGateway(env, fetchImpl);

    await expect(
      gateway.sendText(createConnection(), {
        phone: "chat-1",
        replyToMessageId: "message-1",
        text: "Oi",
      }),
    ).rejects.toBeInstanceOf(CrmWhatsappCapabilityError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [
      "media",
      (gateway: ReturnType<typeof createOlxCrmChatGateway>) =>
        gateway.sendMedia(createConnection(), {
          mediaType: "image",
          mediaUrl: "https://example.test/image.jpg",
          phone: "chat-1",
        }),
    ],
    [
      "reaction",
      (gateway: ReturnType<typeof createOlxCrmChatGateway>) =>
        gateway.sendReaction(createConnection(), {
          messageId: "message-1",
          phone: "chat-1",
          reaction: "👍",
        }),
    ],
    [
      "template",
      (gateway: ReturnType<typeof createOlxCrmChatGateway>) =>
        gateway.sendTemplate(createConnection(), {
          languageCode: "pt_BR",
          name: "hello",
          phone: "chat-1",
        }),
    ],
  ])("fails closed for OLX %s", async (_label, invoke) => {
    const gateway = createOlxCrmChatGateway({});
    await expect(invoke(gateway)).rejects.toBeInstanceOf(
      CrmWhatsappCapabilityError,
    );
  });
});

function createConnection(): CrmConnection {
  return {
    credentialsRef: {
      mode: "stored",
      stored: { accessToken: sealedAccessToken },
    },
    displayName: "OLX",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "25000000-0000-4000-8000-000000000102",
    metadata: {},
    phone: null,
    provider: "olx_chat",
    status: "active",
    storeId: "store_1" as StoreId,
    tenantId: "tenant_1" as TenantId,
    webhookUrl: null,
  };
}

function sendText(gateway: ReturnType<typeof createOlxCrmChatGateway>) {
  return gateway.sendText(createConnection(), { phone: "chat-1", text: "Oi" });
}
