import { describe, expect, it, vi } from "vitest";
import { ingestCampaignMedia } from "./crmCampaignMediaIngestion.js";
import { CrmMessageActionError } from "./crmMessagingErrors.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../services/CrmService/types.js";
import { createServiceContext } from "../../../shared/serviceContext.js";

function createContext(): ServiceContext {
  return createServiceContext({
    actor: { id: "user-1", kind: "user" },
    audit: { record: vi.fn().mockResolvedValue(undefined) },
    entitlements: ["crm"],
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } as never,
    permissions: ["crm.campaigns.manage"],
    request: { requestId: "req-1" },
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
  });
}

describe("ingestCampaignMedia", () => {
  it("returns null fields when no media is provided", async () => {
    const context = createContext();
    const ports = {} as CrmServicePorts;
    const result = await ingestCampaignMedia(context, ports, {});
    expect(result).toEqual({
      mediaFileName: null,
      mediaType: null,
      mediaUrl: null,
      storageKey: null,
    });
  });

  it("successfully ingests a valid PNG image", async () => {
    const context = createContext();
    const putObject = vi.fn().mockResolvedValue({
      publicUrl: "https://storage.example.com/crm/campaigns/img.png",
      storageKey: "crm/campaigns/img.png",
    });
    const ports = {
      crmMediaStorage: { putObject },
    } as unknown as CrmServicePorts;

    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
    ]);
    const base64 = pngHeader.toString("base64");

    const result = await ingestCampaignMedia(context, ports, {
      mediaBase64: `data:image/png;base64,${base64}`,
      mediaFileName: "banner.png",
    });

    expect(result.mediaUrl).toBe(
      "https://storage.example.com/crm/campaigns/img.png",
    );
    expect(result.mediaType).toBe("image/png");
    expect(result.mediaFileName).toBe("banner.png");
    expect(putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/png",
        fileName: "banner.png",
        scopeSegments: ["crm", "campaigns", "tenant-1", "store-1"],
      }),
    );
  });

  it("rejects non-image bytes when unsupported", async () => {
    const context = createContext();
    const ports = {
      crmMediaStorage: { putObject: vi.fn() },
    } as unknown as CrmServicePorts;

    const textBytes = Buffer.from("Hello, this is just plain text");
    const base64 = textBytes.toString("base64");

    await expect(
      ingestCampaignMedia(context, ports, {
        mediaBase64: base64,
        mediaFileName: "file.txt",
      }),
    ).rejects.toThrow(CrmMessageActionError);
  });

  it("rejects non-image bytes even when caller hints image/png (reproduction of review probe)", async () => {
    const context = createContext();
    const putObject = vi.fn();
    const ports = {
      crmMediaStorage: { putObject },
    } as unknown as CrmServicePorts;

    // Plain text bytes passed with mediaType: "image/png"
    const textBase64 = Buffer.from("This is not an image").toString("base64");

    await expect(
      ingestCampaignMedia(context, ports, {
        mediaBase64: textBase64,
        mediaType: "image/png",
      }),
    ).rejects.toThrow("Unsupported image format");

    expect(putObject).not.toHaveBeenCalled();
  });

  it("rejects malformed base64 payload", async () => {
    const context = createContext();
    const ports = {
      crmMediaStorage: { putObject: vi.fn() },
    } as unknown as CrmServicePorts;

    await expect(
      ingestCampaignMedia(context, ports, {
        mediaBase64: "???not-valid-base64!!!",
      }),
    ).rejects.toThrow("not valid base64");

    await expect(
      ingestCampaignMedia(context, ports, { mediaBase64: "Zg=" }),
    ).rejects.toThrow("not valid base64");
  });

  it("rejects when hinted MIME does not match sniffed image format", async () => {
    const context = createContext();
    const ports = {
      crmMediaStorage: { putObject: vi.fn() },
    } as unknown as CrmServicePorts;

    // Valid JPEG header: FF D8 FF
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const base64 = jpegHeader.toString("base64");

    await expect(
      ingestCampaignMedia(context, ports, {
        mediaBase64: base64,
        mediaType: "image/png", // Mismatch: bytes are JPEG, hint is PNG
      }),
    ).rejects.toThrow("does not match detected format");
  });

  it("rejects a data URI MIME hint that does not match the image bytes", async () => {
    const context = createContext();
    const ports = {
      crmMediaStorage: { putObject: vi.fn() },
    } as unknown as CrmServicePorts;
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    await expect(
      ingestCampaignMedia(context, ports, {
        mediaBase64: `data:image/png;base64,${jpegHeader.toString("base64")}`,
      }),
    ).rejects.toThrow("does not match detected format");
  });

  it("enforces server filename extension matching detected MIME", async () => {
    const context = createContext();
    const putObject = vi.fn().mockResolvedValue({
      publicUrl: "https://storage.example.com/crm/campaigns/my-photo.jpg",
      storageKey: "crm/campaigns/my-photo.jpg",
    });
    const ports = {
      crmMediaStorage: { putObject },
    } as unknown as CrmServicePorts;

    // Valid JPEG header: FF D8 FF
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const base64 = jpegHeader.toString("base64");

    const result = await ingestCampaignMedia(context, ports, {
      mediaBase64: base64,
      mediaFileName: "my-photo.png", // Filename has .png but bytes are JPEG
      mediaType: "image/jpeg",
    });

    expect(result.mediaFileName).toBe("my-photo.jpg");
    expect(result.mediaType).toBe("image/jpeg");
    expect(putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/jpeg",
        fileName: "my-photo.jpg",
      }),
    );
  });

  it("rejects images larger than 10MB", async () => {
    const context = createContext();
    const ports = {
      crmMediaStorage: { putObject: vi.fn() },
    } as unknown as CrmServicePorts;

    // 10MB + 1 byte
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
    // Add PNG signature
    largeBuffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const base64 = largeBuffer.toString("base64");

    await expect(
      ingestCampaignMedia(context, ports, {
        mediaBase64: base64,
      }),
    ).rejects.toThrow("Campaign image exceeds 10MB limit.");
  });
});
