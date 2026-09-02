import { describe, expect, it } from "vitest";
import {
  findCrmStatusConnection,
  readCrmChannelLabel,
  readCrmProviderIcon,
  readCrmProviderLabel,
  readCrmConnectionStatus,
  readCrmRealtimeStatus,
} from "./crmConnectionStatus";

describe("readCrmConnectionStatus", () => {
  it("keeps the last provider state while its snapshot refreshes", () => {
    expect(
      readCrmConnectionStatus({
        connectionError: new Error("previous failure"),
        hasConnection: true,
        isLoading: true,
        provider: "zapi",
        state: "active",
      }),
    ).toEqual({ label: "Z-API: online", tone: "online" });
  });

  it("never presents a sandbox history as a live provider connection", () => {
    expect(
      readCrmConnectionStatus({
        connectionError: null,
        hasConnection: true,
        isLoading: false,
        state: "sandbox",
      }),
    ).toEqual({
      label: "Demonstração · somente leitura",
      tone: "neutral",
    });
  });

  it("describes loading, provider errors, and disconnected states", () => {
    expect(
      readCrmConnectionStatus({
        connectionError: null,
        hasConnection: false,
        isLoading: true,
      }),
    ).toEqual({ label: "Verificando provedor", tone: "loading" });
    expect(
      readCrmConnectionStatus({
        connectionError: new Error("zapi down"),
        hasConnection: false,
        isLoading: false,
      }),
    ).toEqual({ label: "Status do provedor indisponível", tone: "error" });
    expect(
      readCrmConnectionStatus({
        connectionError: null,
        hasConnection: false,
        isLoading: false,
      }),
    ).toEqual({ label: "Canal desconectado", tone: "offline" });
  });

  it.each([
    ["active", true, "Z-API: online", "online"],
    ["active", false, "Status do provedor desconhecido", "neutral"],
    ["archived", false, "Canal arquivado", "offline"],
    ["disconnected", false, "Z-API: desconectado", "offline"],
    ["error", false, "Z-API: com erro", "error"],
    ["paused", false, "Z-API: pausado", "offline"],
  ] as const)(
    "maps provider state %s without consulting realtime state",
    (state, hasConnection, label, tone) => {
      expect(
        readCrmConnectionStatus({
          connectionError: null,
          hasConnection,
          isLoading: false,
          provider: "zapi",
          state,
        }),
      ).toEqual({ label, tone });
    },
  );

  it("keeps human provider and channel labels for OLX Chat", () => {
    expect(readCrmProviderLabel("olx")).toBe("OLX Chat");
    expect(readCrmProviderIcon("olx")).toBe("olx");
    expect(readCrmChannelLabel("olx_chat")).toBe("OLX Chat");
    expect(
      readCrmConnectionStatus({
        connectionError: null,
        hasConnection: true,
        isLoading: false,
        provider: "olx",
      }),
    ).toEqual({ label: "OLX Chat: online", tone: "online" });
  });

  it("distinguishes Z-API, official WhatsApp, and Instagram providers", () => {
    expect(readCrmProviderLabel("zapi")).toBe("Z-API");
    expect(readCrmProviderLabel("meta_cloud")).toBe("WhatsApp oficial");
    expect(readCrmChannelLabel("instagram")).toBe("Instagram");
  });

  it("labels UAZAPI as a WhatsApp transport without calling it the channel", () => {
    expect(readCrmProviderLabel("uazapi")).toBe("UAZAPI");
    expect(readCrmProviderIcon("uazapi")).toBe("whatsapp");
    expect(
      readCrmConnectionStatus({
        connectionError: null,
        hasConnection: true,
        isLoading: false,
        provider: "uazapi",
        state: "active",
      }),
    ).toEqual({ label: "UAZAPI: online", tone: "online" });
    expect(
      readCrmConnectionStatus({
        connectionError: null,
        hasConnection: false,
        isLoading: false,
        provider: "uazapi",
        state: "disconnected",
      }),
    ).toEqual({ label: "UAZAPI: desconectado", tone: "offline" });
  });
});

describe("provider and realtime status separation", () => {
  const realtimeCases = [
    ["connected", "Tempo real: sincronizado", "online"],
    ["connecting", "Tempo real: reconectando", "loading"],
    ["degraded", "Tempo real: indisponível", "error"],
    ["offline", "Tempo real: offline", "offline"],
  ] as const;

  it.each(realtimeCases)(
    "maps realtime state %s explicitly",
    (state, label, tone) => {
      expect(readCrmRealtimeStatus(state)).toEqual({ label, tone });
    },
  );

  it.each(["disconnected", "error", "paused"] as const)(
    "keeps provider %s independent across every realtime state",
    (providerState) => {
      const providerStatus = readCrmConnectionStatus({
        connectionError: null,
        hasConnection: false,
        isLoading: false,
        provider: "zapi",
        state: providerState,
      });

      for (const [realtimeState] of realtimeCases) {
        readCrmRealtimeStatus(realtimeState);
        expect(
          readCrmConnectionStatus({
            connectionError: null,
            hasConnection: false,
            isLoading: false,
            provider: "zapi",
            state: providerState,
          }),
        ).toEqual(providerStatus);
      }
    },
  );

  it("prefers the selected connection, then the default, without inventing one", () => {
    const connections = [
      {
        displayName: "Disconnected",
        id: "one",
        isDefault: true,
        provider: "zapi" as const,
        state: "disconnected" as const,
      },
      {
        displayName: "Selected",
        id: "two",
        provider: "meta_cloud" as const,
        state: "error" as const,
      },
    ];

    expect(findCrmStatusConnection(connections, "two")?.id).toBe("two");
    expect(findCrmStatusConnection(connections, null)?.id).toBe("one");
    expect(
      findCrmStatusConnection(
        connections.map((connection) => ({
          ...connection,
          isDefault: false,
        })),
        null,
      ),
    ).toBeNull();
  });
});
