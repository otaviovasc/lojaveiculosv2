import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  campaignStoreId,
  campaignTenantId,
  createCampaignBody,
  createCampaignTestApp,
  jsonPost,
  seedCycle,
} from "./crm.campaigns.testSupport.js";

describe("CRM campaigns with media", () => {
  it("creates campaign with uploaded image media and persists on scheduled messages", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const cycle = await seedCycle(conversationRepository, "5511999999901");

    const putObject = vi.fn().mockResolvedValue({
      publicUrl: "https://storage.example.com/crm/campaigns/promo.png",
      storageKey: "crm/campaigns/promo.png",
    });

    const app = createCampaignTestApp(conversationRepository, undefined, {
      crmMediaStorage: { putObject },
    });

    // Valid PNG header base64
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
    ]).toString("base64");

    const response = await app.request(
      "/api/v1/crm/campaigns",
      jsonPost(
        createCampaignBody([cycle.conversationCycle.id], {
          mediaBase64: `data:image/png;base64,${pngHeader}`,
          mediaFileName: "promo.png",
          mediaType: "image/png",
        }),
      ),
    );

    expect(response.status).toBe(201);
    const campaign = (await response.json()) as {
      id: string;
      mediaFileName?: string | null;
      mediaStorageKey?: string | null;
      mediaType?: string | null;
      mediaUrl?: string | null;
    };
    expect(campaign.mediaFileName).toBe("promo.png");
    expect(campaign.mediaStorageKey).toBe("crm/campaigns/promo.png");
    expect(campaign.mediaUrl).toBe(
      "https://storage.example.com/crm/campaigns/promo.png",
    );
    expect(campaign.mediaType).toBe("image/png");

    const scheduled = await conversationRepository.listScheduledMessages({
      campaignId: campaign.id,
      limit: 10,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.metadata).toMatchObject({
      mediaFileName: "promo.png",
      mediaStorageKey: "crm/campaigns/promo.png",
      mediaType: "image/png",
      mediaUrl: "https://storage.example.com/crm/campaigns/promo.png",
    });
  });

  it("validates recipient access before uploading campaign media", async () => {
    const putObject = vi.fn();
    const app = createCampaignTestApp(
      createMemoryCrmConversationRepository(),
      undefined,
      { crmMediaStorage: { putObject } },
    );
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]).toString("base64");

    const response = await app.request(
      "/api/v1/crm/campaigns",
      jsonPost(
        createCampaignBody(["24000000-0000-4000-8000-000000000999"], {
          mediaBase64: pngHeader,
          mediaType: "image/png",
        }),
      ),
    );

    expect(response.status).toBe(404);
    expect(putObject).not.toHaveBeenCalled();
  });

  it("rejects a 4000-character text as an image caption before uploading", async () => {
    const repository = createMemoryCrmConversationRepository();
    const cycle = await seedCycle(repository, "5511999999902");
    const putObject = vi.fn();
    const app = createCampaignTestApp(repository, undefined, {
      crmMediaStorage: { putObject },
    });
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]).toString("base64");

    const response = await app.request(
      "/api/v1/crm/campaigns",
      jsonPost(
        createCampaignBody([cycle.conversationCycle.id], {
          content: "x".repeat(1001),
          mediaBase64: pngHeader,
          mediaType: "image/png",
        }),
      ),
    );

    expect(response.status).toBe(422);
    expect(putObject).not.toHaveBeenCalled();
  });

  it("does not accept a caller-supplied media URL", async () => {
    const repository = createMemoryCrmConversationRepository();
    const cycle = await seedCycle(repository, "5511999999903");
    const putObject = vi.fn();
    const app = createCampaignTestApp(repository, undefined, {
      crmMediaStorage: { putObject },
    });

    const response = await app.request(
      "/api/v1/crm/campaigns",
      jsonPost(
        createCampaignBody([cycle.conversationCycle.id], {
          mediaUrl: "https://attacker.example/image.png",
        }),
      ),
    );

    expect(response.status).toBe(400);
    expect(putObject).not.toHaveBeenCalled();
  });

  it("keeps committed campaign media when the success audit fails", async () => {
    const repository = createMemoryCrmConversationRepository();
    const cycle = await seedCycle(repository, "5511999999904");
    const putObject = vi.fn().mockResolvedValue({
      publicUrl: "https://storage.example.com/crm/campaigns/audited.png",
      storageKey: "crm/campaigns/audited.png",
    });
    const deleteObject = vi.fn();
    const audit = {
      record: vi.fn(async (event: { action?: string; outcome?: string }) => {
        if (
          event.action === "crm.campaign.create" &&
          event.outcome === "succeeded"
        ) {
          throw new Error("audit unavailable");
        }
      }),
    };
    const app = createCampaignTestApp(repository, undefined, {
      audit,
      auditFailureTier: "required",
      crmMediaStorage: { deleteObject, putObject },
    });
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]).toString("base64");

    const response = await app.request(
      "/api/v1/crm/campaigns",
      jsonPost(
        createCampaignBody([cycle.conversationCycle.id], {
          mediaBase64: pngHeader,
          mediaType: "image/png",
        }),
      ),
    );

    expect(response.status).toBe(500);
    expect(deleteObject).not.toHaveBeenCalled();
    const campaigns = await repository.listCampaigns({
      limit: 10,
      storeId: campaignStoreId,
      tenantId: campaignTenantId,
    });
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]).toMatchObject({
      mediaStorageKey: "crm/campaigns/audited.png",
      mediaType: "image/png",
      mediaUrl: "https://storage.example.com/crm/campaigns/audited.png",
    });
  });
});
