import { describe, expect, it } from "vitest";
import {
  readCrmWhatsappChannelLabel,
  readCrmWhatsappProviderIcon,
  readCrmWhatsappProviderLabel,
  readWhatsappStatus,
} from "./crmWhatsappConnectionStatus";

describe("readWhatsappStatus", () => {
  it("prioritizes the live connection state with a provider-neutral label", () => {
    expect(
      readWhatsappStatus({
        connectionError: new Error("previous failure"),
        hasConnection: true,
        isLoading: false,
      }),
    ).toEqual({ label: "Canal conectado", tone: "online" });
  });

  it("describes loading, provider errors, and disconnected states", () => {
    expect(
      readWhatsappStatus({
        connectionError: null,
        hasConnection: false,
        isLoading: true,
      }),
    ).toEqual({ label: "Verificando", tone: "loading" });
    expect(
      readWhatsappStatus({
        connectionError: new Error("zapi down"),
        hasConnection: false,
        isLoading: false,
      }),
    ).toEqual({ label: "Provedor indisponivel", tone: "error" });
    expect(
      readWhatsappStatus({
        connectionError: null,
        hasConnection: false,
        isLoading: false,
      }),
    ).toEqual({ label: "Desconectado", tone: "offline" });
  });

  it("keeps human provider and channel labels for OLX Chat", () => {
    expect(readCrmWhatsappProviderLabel("olx")).toBe("OLX Chat");
    expect(readCrmWhatsappProviderLabel("olx_chat")).toBe("OLX Chat");
    expect(readCrmWhatsappProviderLabel("OLX_CHAT")).toBe("OLX Chat");
    expect(readCrmWhatsappProviderIcon("olx")).toBe("olx");
    expect(readCrmWhatsappProviderIcon("olx_chat")).toBe("olx");
    expect(readCrmWhatsappProviderIcon("OLX_CHAT")).toBe("olx");
    expect(readCrmWhatsappChannelLabel("OLX_CHAT")).toBe("OLX Chat");
    expect(
      readWhatsappStatus({
        connectionError: null,
        hasConnection: true,
        isLoading: false,
        provider: "olx",
      }),
    ).toEqual({ label: "OLX Chat: online", tone: "online" });
  });

  it("distinguishes Z-API, official WhatsApp, and Instagram providers", () => {
    expect(readCrmWhatsappProviderLabel("zapi")).toBe("Z-API");
    expect(readCrmWhatsappProviderLabel("composio_whatsapp")).toBe(
      "WhatsApp oficial",
    );
    expect(readCrmWhatsappProviderLabel("composio_instagram")).toBe(
      "Instagram",
    );
  });
});
