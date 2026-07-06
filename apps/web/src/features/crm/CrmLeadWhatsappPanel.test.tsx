// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountSessionProvider } from "../account/accountSession";
import type { SessionBootstrap } from "../account/apiClient";
import { CrmLeadWhatsappPanel } from "./CrmLeadWhatsappPanel";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type {
  CrmWhatsappMessage,
  CrmWhatsappProviderConnection,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";
import type { ProductCrmLead } from "./productCrmTypes";

describe("CrmLeadWhatsappPanel", () => {
  afterEach(() => {
    cleanup();
    window.location.hash = "";
    vi.clearAllMocks();
  });

  it("links an existing WhatsApp session from the lead chat tab", async () => {
    const session = createWhatsappSession({ id: "session_1" });
    const api = createWhatsappApi({
      listConnections: vi.fn(async () => ({
        connections: [createConnection()],
      })),
      listSessions: vi.fn(async () => [session]),
    });

    renderPanel(api);

    expect(await screen.findByText("Conversa vinculada")).toBeVisible();
    expect(screen.getByText("Lead V2")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /abrir conversa/i }),
    ).toHaveAttribute("href", "#/crm?surface=whatsapp&sessionId=session_1");
    expect(api.listSessions).toHaveBeenCalledWith({
      leadId: baseLead.id,
      limit: 5,
    });
  });

  it("starts a conversation by lead id and opens the WhatsApp surface", async () => {
    const user = userEvent.setup();
    const session = createWhatsappSession({ id: "session_2" });
    const startConversation = vi.fn(async () => ({
      lead: baseLead,
      message: createMessage(),
      session,
    }));
    const api = createWhatsappApi({
      listConnections: vi.fn(async () => ({
        connections: [createConnection()],
      })),
      listSessions: vi.fn(async () => []),
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
      "#/crm?surface=whatsapp&sessionId=session_2",
    );
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

function renderPanel(api: CrmWhatsappApi) {
  render(
    <AccountSessionProvider session={createSession()}>
      <CrmLeadWhatsappPanel api={api} lead={baseLead} />
    </AccountSessionProvider>,
  );
}

function createWhatsappApi(overrides: Partial<CrmWhatsappApi>): CrmWhatsappApi {
  return new Proxy(overrides, {
    get(target, prop: keyof CrmWhatsappApi) {
      if (prop in target) return target[prop];
      return vi.fn(async () => {
        throw new Error(`Unexpected CRM WhatsApp API call: ${String(prop)}`);
      });
    },
  }) as CrmWhatsappApi;
}

function createConnection(): CrmWhatsappProviderConnection {
  return {
    credentials: {
      apiBaseUrlEnv: null,
      clientTokenEnv: null,
      instanceIdEnv: null,
      instanceTokenEnv: null,
      mode: null,
    },
    displayName: "ZAPI",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "24000000-0000-4000-8000-000000000101",
    live: {
      checkedAt: "2026-07-06T10:00:00.000Z",
      connected: true,
      connectedPhone: "5511999999999",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    metadata: {
      catalogPhone: null,
      connectedPhone: null,
      migrationUnit: null,
      purpose: null,
    },
    phone: null,
    provider: "zapi",
    status: "sandbox",
    webhookUrl: null,
  };
}

function createMessage(): CrmWhatsappMessage {
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
  permissions = ["crm.whatsapp.list", "crm.whatsapp.send"],
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

function createWhatsappSession(
  overrides: Partial<CrmWhatsappSession> = {},
): CrmWhatsappSession {
  return {
    buyerName: baseLead.buyerName,
    buyerPhone: baseLead.buyerPhone,
    channel: "WHATSAPP",
    id: "session_1",
    leadId: baseLead.id,
    status: "ACTIVE",
    uuid: "session_1",
    ...overrides,
  };
}
