// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsApi } from "./apiClient";
import type { SessionBootstrap } from "../account/apiClient";
import { AccountSessionProvider } from "../account/accountSession";
import type { CrmPushApi } from "../crm/push/apiClient";
import { CrmPushProvider } from "../crm/push/CrmPushProvider";
import type { CrmPushBrowser } from "../crm/push/types";
import { SettingsModule } from "./SettingsModule";
import type { StoreSettingsSnapshot } from "./types";

describe("SettingsModule", () => {
  afterEach(cleanup);

  it("keeps the compact settings navigation and an honest unavailable state", async () => {
    const { container } = render(
      <SettingsModule api={createUnavailableApi()} initialTab="store" />,
    );

    expect(container.querySelector(".settings-page-shell")).toBeInTheDocument();
    expect(
      screen.getByRole("tablist", { name: "Áreas de configuração" }),
    ).toBeVisible();
    expect(screen.getByRole("tab", { name: "Perfil da Loja" })).toHaveClass(
      "!bg-accent",
    );
    expect(screen.getByRole("tab", { name: "Domínio" })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Vitrine Digital" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Configurações da loja" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText("Configurações indisponíveis"),
    ).toBeVisible();
    expect(screen.getByText(/Nenhuma alteração foi aplicada/)).toBeVisible();
  });

  it("edits the custom domain from the Domínio tab", async () => {
    const updateStoreSettings = vi.fn(async (input: unknown) => ({
      ...settingsSnapshot(),
      publicSite: {
        ...settingsSnapshot().publicSite,
        ...(input as { publicSite?: object }).publicSite,
      },
    }));
    const api = createAvailableApi(updateStoreSettings);

    render(<SettingsModule api={api} initialTab="domain" />);

    const input = await screen.findByPlaceholderText("www.sualoja.com.br");
    expect(input).toHaveValue("www.loja.com.br");
    expect(screen.getAllByDisplayValue("www.loja.com.br")).toHaveLength(2);

    fireEvent.change(input, { target: { value: "veiculos.novadominio.br" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await vi.waitFor(() =>
      expect(updateStoreSettings).toHaveBeenCalledWith({
        publicSite: { customDomain: "veiculos.novadominio.br" },
      }),
    );
  });

  it("shows only notifications and skips management APIs for CRM-only users", async () => {
    const settingsApi = createUnavailableApi();

    render(
      <AccountSessionProvider session={crmOnlySession()}>
        <CrmPushProvider api={pushApi()} browser={pushBrowser()}>
          <SettingsModule api={settingsApi} initialTab="store" />
        </CrmPushProvider>
      </AccountSessionProvider>,
    );

    expect(
      await screen.findByRole("tab", { name: "Notificações" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("region", { name: "Notificações do CRM" }),
    ).toBeVisible();
    expect(screen.queryByRole("tab", { name: "Perfil da Loja" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Domínio" })).toBeNull();
    expect(
      screen.queryByRole("tab", { name: "Papéis e Permissões" }),
    ).toBeNull();
    expect(settingsApi.getStoreSettings).not.toHaveBeenCalled();
    expect(settingsApi.getRoleManagement).not.toHaveBeenCalled();
  });
});

function createUnavailableApi(): SettingsApi {
  return {
    getStoreMemberOptions: vi.fn(async () => ({ members: [] })),
    getRoleManagement: vi.fn(async () => {
      throw new Error("roles unavailable");
    }),
    getStoreSettings: vi.fn(async () => {
      throw new Error("settings unavailable");
    }),
    inviteStoreMember: vi.fn(),
    resendInvitation: vi.fn(),
    updateMembershipAccess: vi.fn(),
    updateStoreSettings: vi.fn(),
  };
}

function createAvailableApi(
  updateStoreSettings: SettingsApi["updateStoreSettings"],
): SettingsApi {
  return {
    getStoreMemberOptions: vi.fn(async () => ({ members: [] })),
    getRoleManagement: vi.fn(async () => {
      throw new Error("roles unavailable");
    }),
    getStoreSettings: vi.fn(async () => settingsSnapshot()),
    inviteStoreMember: vi.fn(),
    resendInvitation: vi.fn(),
    updateMembershipAccess: vi.fn(),
    updateStoreSettings,
  };
}

function settingsSnapshot(): StoreSettingsSnapshot {
  return {
    identity: {
      legalName: "Loja Ltda",
      primaryDomain: null,
      publicSlug: "loja",
      tradingName: "Loja",
    },
    profile: {
      addressCity: null,
      addressLine1: null,
      addressLine2: null,
      addressState: null,
      addressZipCode: null,
      businessHours: {},
      contactEmail: null,
      contactPhone: null,
      documentNumber: null,
      logoImageUrl: null,
      whatsappPhone: null,
    },
    publicSite: {
      customDomain: "www.loja.com.br",
      customDomainStatus: "pending",
      heroImageUrl: null,
      isPublished: true,
      layoutKey: "default",
      seoDescription: null,
      seoTitle: null,
      theme: {},
      verificationToken: null,
    },
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}

function crmOnlySession(): SessionBootstrap {
  const store = {
    effectivePermissions: ["crm.conversations.read"],
    entitlements: ["crm"],
    role: "seller",
    status: "active" as const,
    storeId: "store_1",
    storeName: "Loja 1",
    storeSlug: "loja-1",
    tenantId: "tenant_1",
    tenantName: "Tenant 1",
  };
  return {
    defaultStore: store,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [store],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk_1",
      email: "seller@example.com",
      id: "user_1",
      name: "Seller",
    },
  };
}

function pushApi(): CrmPushApi {
  return {
    disableSubscription: vi.fn(async () => undefined),
    getSettings: vi.fn(async () => ({
      appId: "app-id",
      deliveryMode: "live" as const,
      preference: { enabled: true },
      subscription: { enabled: true, id: "subscription-1" },
    })),
    registerSubscription: vi.fn(async () => undefined),
    updatePreference: vi.fn(async () => undefined),
  };
}

function pushBrowser(): CrmPushBrowser {
  return {
    getSnapshot: () => ({
      optedIn: true,
      permission: "granted",
      subscriptionId: "subscription-1",
    }),
    initialize: vi.fn(async () => undefined),
    isSupported: () => true,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    optIn: vi.fn(async () => undefined),
    optOut: vi.fn(async () => undefined),
    requestPermission: vi.fn(async () => undefined),
    waitForSubscriptionId: vi.fn(async () => "subscription-1"),
  };
}
