import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { ingestUazapiProfilePhoto } from "./uazapiProfilePhotoIngestion.js";

const scope = {
  storeId: "store-1" as StoreId,
  tenantId: "tenant-1" as TenantId,
};

describe("ingestUazapiProfilePhoto", () => {
  it("falls back to the provider profile lookup when the webhook carries no photo", async () => {
    const getProfilePhotoUrl = vi.fn(
      async () => "https://pps.whatsapp.net/v/t61.24694-24/12345_image.jpg",
    );
    const fetchMedia = vi.fn(async () => ({
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
      finalUrl: "https://pps.whatsapp.net/v/t61.24694-24/12345_image.jpg",
    }));
    const putObject = vi.fn(async () => ({
      publicUrl: "https://cdn.local/profile.jpg",
      storageKey: "test/crm/profile.jpg",
    }));
    const upsertConversationCycleContext = vi.fn(
      async (input: Record<string, unknown>) => input,
    );

    const result = await ingestUazapiProfilePhoto(
      context(),
      {
        connection: connection(),
        message: {
          content: "Ola",
          externalId: "3EB0538DA65A59F6D8A251",
          fromMe: false,
          metadata: {},
          phone: "5511999999999",
          providerTimestamp: new Date(),
          type: "TEXT",
        },
      },
      ports({
        getProfilePhotoUrl,
        fetchMedia,
        putObject,
        upsertConversationCycleContext,
      }),
    );

    expect(result).toMatchObject({
      profilePhotoUrl: "https://cdn.local/profile.jpg",
      status: "stored",
      storageKey: "test/crm/profile.jpg",
    });
    expect(getProfilePhotoUrl).toHaveBeenCalledWith(connection(), {
      phone: "5511999999999",
    });
    expect(upsertConversationCycleContext).toHaveBeenCalledWith(
      expect.objectContaining({
        profilePhotoStorageKey: "test/crm/profile.jpg",
        profilePhotoUrl: "https://cdn.local/profile.jpg",
      }),
    );
  });

  it("never resolves a photo for the connected account itself (fromMe)", async () => {
    const getProfilePhotoUrl = vi.fn();

    const result = await ingestUazapiProfilePhoto(
      context(),
      {
        connection: connection(),
        message: {
          content: "echo",
          externalId: "3EB0ECHO",
          fromMe: true,
          metadata: {},
          phone: "5511999999999",
          providerTimestamp: new Date(),
          type: "TEXT",
        },
      },
      ports({ getProfilePhotoUrl }),
    );

    expect(result.status).toBe("unavailable");
    expect(getProfilePhotoUrl).not.toHaveBeenCalled();
  });
});

function context() {
  return createServiceContext({
    actor: { id: "uazapi", kind: "integration" },
    permissions: ["crm.messages.ingest"],
    request: { requestId: "request-1" },
  });
}

function connection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "Uazapi",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "uazapi",
    status: "active",
    ...scope,
    webhookUrl: null,
  };
}

function ports(input: {
  fetchMedia?: (url: {
    maxBytes: number;
    url: string;
  }) => Promise<{ body: Uint8Array; contentType: string; finalUrl: string }>;
  getProfilePhotoUrl?: ReturnType<typeof vi.fn>;
  putObject?: ReturnType<typeof vi.fn>;
  upsertConversationCycleContext?: ReturnType<typeof vi.fn>;
}): CrmServicePorts {
  return {
    crmConversationRepository: {
      findConversationCycleByIdentity: vi.fn(async () => null),
      upsertConversationCycleContext:
        input.upsertConversationCycleContext ?? vi.fn(),
    },
    crmMediaFetcher: input.fetchMedia ? { fetchMedia: input.fetchMedia } : null,
    crmMediaStorage: input.putObject ? { putObject: input.putObject } : null,
    crmMessagingGateway: input.getProfilePhotoUrl
      ? { getProfilePhotoUrl: input.getProfilePhotoUrl }
      : undefined,
  } as unknown as CrmServicePorts;
}
