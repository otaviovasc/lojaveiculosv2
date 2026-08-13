import { describe, expect, it } from "vitest";
import {
  readCrmWhatsappConnectionCapabilities,
  readCrmWhatsappSendReadiness,
} from "./crmWhatsappProviderCapabilities";

const zapiCapabilities = {
  audio: true,
  catalog: true,
  conversationStart: true,
  delete: true,
  documents: true,
  imageCaption: true,
  images: true,
  location: true,
  quickMessages: true,
  reactions: true,
  reply: true,
  scheduling: true,
  templates: false,
  text: true,
  vehicle: true,
  video: true,
} as const;

describe("CRM connection capabilities", () => {
  it("maps every server-owned action flag without provider inference", () => {
    expect(
      readCrmWhatsappConnectionCapabilities({
        capabilities: zapiCapabilities,
        provider: "backend_defined_provider",
      }),
    ).toEqual({
      allowAudio: true,
      allowCatalog: true,
      allowDelete: true,
      allowDocuments: true,
      allowImageCaption: true,
      allowImages: true,
      allowLocation: true,
      allowQuickMessages: true,
      allowReactions: true,
      allowReply: true,
      allowScheduling: true,
      allowVehicle: true,
      allowVideo: true,
      officialWindowNotice: null,
      provider: "backend_defined_provider",
    });
  });

  it("preserves a server-provided official window notice", () => {
    expect(
      readCrmWhatsappConnectionCapabilities({
        capabilities: {
          ...zapiCapabilities,
          audio: false,
          officialWindowNotice: "A janela oficial exige um template aprovado.",
        },
        provider: "backend_defined_provider",
      }),
    ).toMatchObject({
      allowAudio: false,
      officialWindowNotice: "A janela oficial exige um template aprovado.",
    });
  });

  it("fails closed when the server capability DTO is missing", () => {
    expect(
      readCrmWhatsappConnectionCapabilities({ provider: "zapi" }),
    ).toMatchObject({
      allowAudio: false,
      allowCatalog: false,
      allowImages: false,
      allowReply: false,
      provider: "unknown",
    });
  });

  it("blocks sending until the server confirms text capability", () => {
    expect(
      readCrmWhatsappSendReadiness(
        {
          displayName: "Canal",
          externalConnectionId: null,
          externalInstanceId: null,
          id: "connection_1",
          live: {
            checkedAt: "2026-08-11T12:00:00.000Z",
            connected: true,
            connectedPhone: null,
            providerStatus: "connected",
            smartphoneConnected: true,
          },
          phone: null,
          provider: "zapi",
          ready: true,
          status: "active",
          webhookUrl: null,
        },
        "connected",
      ),
    ).toEqual({
      canSend: false,
      reason: "As capacidades deste canal ainda não foram confirmadas.",
    });
  });

  it("closes composer capabilities and send readiness for a paused connection", () => {
    const pausedConnection = {
      capabilities: zapiCapabilities,
      displayName: "Canal pausado",
      externalConnectionId: null,
      externalInstanceId: null,
      id: "connection_paused",
      live: {
        checkedAt: "2026-08-11T12:00:00.000Z",
        connected: true,
        connectedPhone: null,
        providerStatus: "connected" as const,
        smartphoneConnected: true,
      },
      phone: null,
      provider: "zapi" as const,
      ready: true,
      status: "paused" as const,
      webhookUrl: null,
    };

    expect(
      readCrmWhatsappConnectionCapabilities(pausedConnection),
    ).toMatchObject({
      allowAudio: false,
      allowImages: false,
      allowReply: false,
      provider: "zapi",
    });
    expect(readCrmWhatsappSendReadiness(pausedConnection, "connected")).toEqual(
      {
        canSend: false,
        reason: "Este canal está pausado ou indisponível no CRM.",
      },
    );
  });
});
