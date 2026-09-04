// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountSessionProvider } from "../account/accountSession";
import type { CrmConnectionOverviewItem } from "@lojaveiculosv2/shared";
import type { SessionBootstrap } from "../account/apiClient";
import { CrmLeadConversationPanel } from "./CrmLeadConversationPanel";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmMessage, CrmConversationCycle } from "./crmConversationTypes";
import type { ProductCrmLead } from "./productCrmTypes";

describe("CrmLeadConversationPanel", () => {
  afterEach(() => {
    cleanup();
    window.location.hash = "";
    vi.clearAllMocks();
  });

  it("links an existing WhatsApp cycle from the lead chat tab", async () => {
    const cycle = createConversationCycle({ id: "session_1" });
    const api = createConversationApi({
      listConnections: vi.fn(async () => ({
        allowance: { limit: 1, remaining: 0, used: 1 },
        availableSetups: [],
        connections: [createConnection()],
      })),
      listConversationCycles: vi.fn(async () => [cycle]),
    });

    renderPanel(api);

    expect(await screen.findByText("Conversa vinculada")).toBeVisible();
    expect(screen.getByText("Lead V2")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /abrir conversa/i }),
    ).toHaveAttribute("href", "#/crm?surface=conversations&cycleId=session_1");
    expect(api.listConversationCycles).toHaveBeenCalledWith({
      leadId: baseLead.id,
      limit: 5,
    });
  });

  it("starts a conversation by lead id and opens the WhatsApp surface", async () => {
    const user = userEvent.setup();
    const cycle = createConversationCycle({ id: "session_2" });
    const startConversation = vi.fn(async () => ({
      lead: baseLead,
      message: createMessage(),
      cycle,
    }));
    const api = createConversationApi({
      listConnections: vi.fn(async () => ({
        allowance: { limit: 1, remaining: 0, used: 1 },
        availableSetups: [],
        connections: [createConnection()],
      })),
      listConversationCycles: vi.fn(async () => []),
      startConversation,
    });

    renderPanel(api);

    expect(await screen.findByText("Nenhuma conversa vinculada")).toBeVisible();
    await user.type(
      screen.getByPlaceholderText("Mensagem inicial"),
      "Ola, vamos conversar.",
    );
    await user.click(screen.getByRole("button", { name: /iniciar conversa/i }));

    await waitFor(() =>
      expect(startConversation).toHaveBeenCalledWith({
        connectionId: "24000000-0000-4000-8000-000000000101",
        leadId: baseLead.id,
        text: "Ola, vamos conversar.",
      }),
    );
    expect(window.location.hash).toBe(
      "#/crm?surface=conversations&cycleId=session_2",
    );
  });

  it("does not send unsupported free text through an official-only connection", async () => {
    const startConversation = vi.fn();
    const api = createConversationApi({
      listConnections: vi.fn(async () => ({
        allowance: { limit: 1, remaining: 0, used: 1 },
        availableSetups: [],
        connections: [createConnection("meta_cloud")],
      })),
      listConversationCycles: vi.fn(async () => []),
      startConversation,
    });

    renderPanel(api);

    expect(
      await screen.findByText(/template aprovado em Nova conversa/i),
    ).toBeVisible();
    expect(screen.getByPlaceholderText("Mensagem inicial")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /iniciar conversa/i }),
    ).toBeDisabled();
    expect(startConversation).not.toHaveBeenCalled();
  });
});

const baseLead: ProductCrmLead = {
  assignedUserId: null,
  buyerEmail: null,
  buyerName: "Lead V2",
  buyerPhone: "5511977776666",
  createdAt: "2026-07-06T10:00:00.000Z",
  id: "22000000-0000-4000-8000-000000000001",
  lastInteractionAt: null,
  listingId: null,
  metadata: {},
  pipelineId: null,
  pipelineStageId: null,
  source: "manual",
  status: "new",
  storeId: "store_1",
  tenantId: "tenant_1",
  updatedAt: "2026-07-06T10:00:00.000Z",
  vehicleTitle: null,
};

function renderPanel(api: CrmConversationApi) {
  render(
    <AccountSessionProvider session={createSession()}>
      <CrmLeadConversationPanel api={api} lead={baseLead} />
    </AccountSessionProvider>,
  );
}

function createConversationApi(
  overrides: Partial<CrmConversationApi>,
): CrmConversationApi {
  return new Proxy(overrides, {
    get(target, prop: keyof CrmConversationApi) {
      if (prop in target) return target[prop];
      return vi.fn(async () => {
        throw new Error(`Unexpected CRM WhatsApp API call: ${String(prop)}`);
      });
    },
  }) as CrmConversationApi;
}

function createConnection(
  setupProvider: "meta_cloud" | "zapi" = "zapi",
): CrmConnectionOverviewItem {
  const provider = setupProvider === "zapi" ? "zapi" : "meta_cloud";
  return {
    capabilities:
      provider === "zapi"
        ? ["conversation_start", "media", "outbound", "scheduling", "text"]
        : ["conversation_start", "media", "outbound", "templates", "text"],
    channel: "whatsapp",
    displayName: provider === "zapi" ? "ZAPI" : "WhatsApp oficial",
    id: "24000000-0000-4000-8000-000000000101",
    live: {
      checkedAt: "2026-07-06T10:00:00.000Z",
      connected: true,
      connectedPhone: "5511999999999",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    provider,
    isDefault: true,
    readiness: { ready: true, reason: null, reasonCode: "ready" },
    state: "active",
  };
}

function createMessage(): CrmMessage {
  return {
    content: "Ola, vamos conversar.",
    createdAt: "2026-07-06T10:00:00.000Z",
    direction: "OUTBOUND",
    id: "message_1",
    senderType: "HUMAN",
    status: "SENT",
    type: "TEXT",
  };
}

function createSession(
  permissions = ["crm.conversations.read", "crm.messages.send"],
): SessionBootstrap {
  return {
    defaultStore: {
      effectivePermissions: permissions,
      role: "owner",
      status: "active",
      storeId: "store_1",
      storeName: "Loja",
      storeSlug: "test-store",
      tenantId: "tenant_1",
      tenantName: "Tenant",
    },
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk_owner",
      email: "owner@loja.local",
      id: "user_owner",
      name: "Owner",
    },
  };
}

function createConversationCycle(
  overrides: Partial<CrmConversationCycle> = {},
): CrmConversationCycle {
  return {
    customerDisplayName: baseLead.buyerName,
    customerPhone: baseLead.buyerPhone,
    channel: "whatsapp",
    id: "session_1",
    leadId: baseLead.id,
    status: "ACTIVE",
    ...overrides,
  };
}
