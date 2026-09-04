import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  CrmMessagingSendMediaInput,
  CrmMessagingSendTextInput,
} from "../../../domains/crm/ports/crmMessagingGateway.js";
import { CrmMessagingGatewayError } from "../../../domains/crm/ports/crmMessagingGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp, expectApiError } from "./crm.controller.testSupport.js";
import {
  connectionId,
  createVehicleInventory,
  createZapiConnection,
  seedCycle,
  storeId,
  tenantId,
  vehicleListingId,
  vehicleUnitId,
} from "./crm.whatsapp.vehicle.testSupport.js";

describe("CRM WhatsApp vehicle sending", () => {
  it("sends a vehicle package from scoped inventory media", async () => {
    const whatsappRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(whatsappRepository, "vehicle");
    const vehiclePorts = createVehicleInventory([
      {
        displayOrder: 2,
        id: "media_vehicle_2",
        url: "https://cdn.local/audi-traseira.jpg",
      },
      {
        displayOrder: 1,
        id: "media_vehicle_1",
        url: "https://cdn.local/audi-frente.jpg",
      },
    ]);
    const sendMedia = vi.fn(
      async (
        _connection: CrmConnection,
        _input: CrmMessagingSendMediaInput,
      ) => ({
        externalId: `zapi-media-${sendMedia.mock.calls.length + 1}`,
        providerTimestamp: new Date("2026-07-02T20:04:00.000Z"),
        raw: { ok: true },
      }),
    );
    const sendText = vi.fn(
      async (
        _connection: CrmConnection,
        _input: CrmMessagingSendTextInput,
      ) => ({
        externalId: "zapi-vehicle-summary-1",
        providerTimestamp: new Date("2026-07-02T20:04:05.000Z"),
        raw: { ok: true },
      }),
    );
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: { sendMedia, sendText },
      crmConversationRepository: whatsappRepository,
      vehicleInventory: {
        listingRepository: vehiclePorts.listingRepository,
        mediaRepository: vehiclePorts.mediaRepository!,
        unitRepository: vehiclePorts.unitRepository!,
      },
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/vehicle", {
      body: JSON.stringify({
        listingId: vehicleListingId,
        mediaLimit: 4,
        cycleId: inbound.conversationCycle.id,
        unitId: vehicleUnitId,
      }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "vehicle-package-1",
      },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(sendMedia).toHaveBeenCalledTimes(2);
    expect(sendMedia).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: connectionId }),
      expect.objectContaining({
        mediaUrl: "https://cdn.local/audi-frente.jpg",
        phone: "5511999999999",
      }),
    );
    expect(
      readMockInput<CrmMessagingSendMediaInput>(sendMedia, 0, 1).caption,
    ).toContain("Audi A4 Prestige Plus 2022");
    expect(sendMedia).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: connectionId }),
      expect.objectContaining({
        mediaUrl: "https://cdn.local/audi-traseira.jpg",
        phone: "5511999999999",
      }),
    );
    expect(sendText).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId }),
      expect.objectContaining({ phone: "5511999999999" }),
    );
    expect(
      readMockInput<CrmMessagingSendTextInput>(sendText, 0, 1).text,
    ).toContain("R$");
    await expect(response.json()).resolves.toMatchObject({
      clientRequestId: "vehicle-package-1",
      content: "Audi A4 Prestige Plus 2022",
      externalId: "zapi-vehicle-summary-1",
      metadata: {
        mediaSentCount: 2,
        providerTransport: "zapi_media_sequence",
        vehicle: {
          listingId: vehicleListingId,
          mediaIds: ["media_vehicle_1", "media_vehicle_2"],
          unitId: vehicleUnitId,
        },
      },
      type: "CATALOG",
    });
  });

  it("does not send summary text when provider fails after one media send", async () => {
    const whatsappRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(whatsappRepository, "vehicle-partial");
    const vehiclePorts = createVehicleInventory([
      {
        displayOrder: 1,
        id: "media_vehicle_1",
        url: "https://cdn.local/audi-frente.jpg",
      },
      {
        displayOrder: 2,
        id: "media_vehicle_2",
        url: "https://cdn.local/audi-traseira.jpg",
      },
    ]);
    const sendMedia = vi.fn(
      async (
        _connection: CrmConnection,
        _input: CrmMessagingSendMediaInput,
      ) => {
        if (sendMedia.mock.calls.length === 2) {
          throw new CrmMessagingGatewayError("ZAPI media upload failed");
        }
        return {
          externalId: "zapi-media-1",
          providerTimestamp: new Date("2026-07-02T20:04:00.000Z"),
          raw: { ok: true },
        };
      },
    );
    const sendText = vi.fn(
      async (
        _connection: CrmConnection,
        _input: CrmMessagingSendTextInput,
      ) => ({
        externalId: "zapi-vehicle-summary-1",
        providerTimestamp: new Date("2026-07-02T20:04:05.000Z"),
        raw: { ok: true },
      }),
    );
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: { sendMedia, sendText },
      crmConversationRepository: whatsappRepository,
      vehicleInventory: {
        listingRepository: vehiclePorts.listingRepository,
        mediaRepository: vehiclePorts.mediaRepository!,
        unitRepository: vehiclePorts.unitRepository!,
      },
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/vehicle", {
      body: JSON.stringify({
        listingId: vehicleListingId,
        mediaLimit: 4,
        cycleId: inbound.conversationCycle.id,
        unitId: vehicleUnitId,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(502);
    await expectApiError(response, {
      code: "CRM_WHATSAPP_VEHICLE_PARTIAL_SEND",
      message:
        "Vehicle package send failed after 1 of 2 media messages. Summary text was not sent. Provider error: ZAPI media upload failed",
    });
    expect(sendMedia).toHaveBeenCalledTimes(2);
    expect(sendText).not.toHaveBeenCalled();

    const messages = await whatsappRepository.listMessages({
      limit: 10,
      offset: 0,
      cycleId: inbound.conversationCycle.id,
      storeId,
      tenantId,
    });
    const outboundMessages = messages.filter(
      (message) => message.direction === "OUTBOUND",
    );
    expect(outboundMessages).toHaveLength(1);
    expect(outboundMessages[0]).toMatchObject({
      externalId: "zapi-media-1",
      mediaUrl: "https://cdn.local/audi-frente.jpg",
      type: "IMAGE",
    });
    expect(messages.some((message) => message.type === "CATALOG")).toBe(false);
  });
});

function readMockInput<T>(
  mock: { mock: { calls: readonly (readonly unknown[])[] } },
  callIndex: number,
  inputIndex: number,
) {
  return mock.mock.calls[callIndex]?.[inputIndex] as T;
}
