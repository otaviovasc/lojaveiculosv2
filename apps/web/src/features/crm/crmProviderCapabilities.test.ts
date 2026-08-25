import { describe, expect, it } from "vitest";
import {
  readCrmConnectionCapabilities,
  readCrmSendReadiness,
} from "./crmProviderCapabilities";

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
  it("maps canonical server-owned capabilities without provider inference", () => {
    expect(
      readCrmConnectionCapabilities({
        capabilities: [
          "conversation_start",
          "media",
          "outbound",
          "scheduling",
          "text",
        ],
        provider: "zapi",
      }),
    ).toEqual({
      allowAudio: true,
      allowCatalog: false,
      allowDelete: false,
      allowDocuments: true,
      allowImageCaption: true,
      allowImages: true,
      allowLocation: true,
      allowQuickMessages: true,
      allowReactions: false,
      allowReply: true,
      allowScheduling: true,
      allowVehicle: true,
      allowVideo: true,
      officialWindowNotice: null,
      provider: "zapi",
    });
  });

  it("adds the transport-specific official window notice for Meta", () => {
    expect(
      readCrmConnectionCapabilities({
        capabilities: ["outbound", "templates", "text"],
        provider: "meta_cloud",
      }),
    ).toMatchObject({
      allowAudio: false,
      provider: "meta_cloud",
    });
  });

  it("fails closed when the server capability DTO is missing", () => {
    expect(readCrmConnectionCapabilities({ provider: "zapi" })).toMatchObject({
      allowAudio: false,
      allowCatalog: false,
      allowImages: false,
      allowReply: false,
      provider: "zapi",
    });
  });

  it("blocks sending until the server confirms text capability", () => {
    expect(
      readCrmSendReadiness({
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
      }),
    ).toEqual({
      canSend: false,
      reason: "As capacidades deste canal ainda não foram confirmadas.",
    });
  });

  it("keeps sandbox conversations explicitly read-only", () => {
    expect(
      readCrmSendReadiness({
        capabilities: ["inbound", "media", "text"],
        displayName: "WhatsApp fictício para demo de UI",
        id: "connection_demo",
        provider: "meta_cloud",
        readiness: {
          ready: false,
          reason: "sandbox",
          reasonCode: "provider_not_connected",
        },
        state: "sandbox",
      }),
    ).toEqual({
      canSend: false,
      reason:
        "Esta conexão de demonstração é somente leitura. Nenhuma mensagem oficial será enviada.",
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
      state: "paused" as const,
      webhookUrl: null,
    };

    expect(readCrmConnectionCapabilities(pausedConnection)).toMatchObject({
      allowAudio: false,
      allowImages: false,
      allowReply: false,
      provider: "zapi",
    });
    expect(readCrmSendReadiness(pausedConnection)).toEqual({
      canSend: false,
      reason: "Este canal está pausado ou indisponível no CRM.",
    });
  });
});
