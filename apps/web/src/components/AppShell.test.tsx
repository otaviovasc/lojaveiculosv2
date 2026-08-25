// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { moduleDefinitions } from "../app/moduleDefinitions";
import type { SessionBootstrap } from "../features/account/apiClient";
import {
  persistCurrentStoreSlug,
  readCurrentStoreSlug,
} from "../features/account/currentStore";
import {
  readStoreWorkspaceState,
  switchStoreWorkspace,
} from "../features/account/storeWorkspace";
import type { StoreSettingsSnapshot } from "../features/settings/types";
import { createSettingsApiOptions } from "../features/settings/runtimeApi";
import { AppShell } from "./AppShell";

vi.mock("../features/settings/runtimeApi", () => ({
  createSettingsApiOptions: vi.fn(),
}));

vi.mock("../features/account/UserAccountButton", () => ({
  UserAccountButton: () => <button type="button">Conta</button>,
}));

describe("AppShell tenant branding", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("waits for tenant styling before rendering admin content", async () => {
    const accent = hex("0f766e");
    const settings = createSettings({
      profile: {
        logoImageUrl: "https://cdn.example.com/logo.png",
      },
      theme: {
        accentColor: accent,
        corretorName: "MB Auto Store",
        faviconUrl: "https://cdn.example.com/favicon.png",
      },
    });
    const fetchMock = vi.fn();
    let resolveFetch!: (response: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.mocked(createSettingsApiOptions).mockResolvedValue({
      fetch: fetchMock as unknown as typeof fetch,
    });

    render(
      <AppShell activeModule={moduleDefinitions.dashboard} onNavigate={vi.fn()}>
        <div>Loaded child</div>
      </AppShell>,
    );

    expect(screen.queryByText("Loaded child")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    await act(async () => {
      resolveFetch(jsonResponse(settings));
    });

    expect(await screen.findByText("Loaded child")).toBeInTheDocument();
    expect(
      screen.getAllByRole("img", { name: "MB Auto Store" })[0],
    ).toHaveAttribute("src", "https://cdn.example.com/logo.png");
    expect(
      document.querySelector('link[data-tenant-admin-brand="favicon"]'),
    ).toHaveAttribute("href", "https://cdn.example.com/favicon.png");
    expect(
      document.documentElement.style.getPropertyValue("--color-accent"),
    ).toBe(accent);
  });
});

describe("AppShell sidebar collapse behavior", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    vi.mocked(createSettingsApiOptions).mockResolvedValue({
      fetch: vi.fn().mockResolvedValue(jsonResponse(createSettings())),
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("forces sidebar collapse on full-width pages and auto-expands after leaving", async () => {
    const { container, rerender } = render(
      <AppShell activeModule={moduleDefinitions.dashboard} onNavigate={vi.fn()}>
        <div>App content</div>
      </AppShell>,
    );

    await screen.findByText("App content");
    expect(container.querySelector(".app-shell")).not.toHaveClass(
      "app-shell--compact",
    );

    await act(async () => {
      rerender(
        <AppShell activeModule={moduleDefinitions.crm} onNavigate={vi.fn()}>
          <div>App content</div>
        </AppShell>,
      );
    });

    expect(container.querySelector(".app-shell")).toHaveClass(
      "app-shell--compact",
    );

    await act(async () => {
      rerender(
        <AppShell
          activeModule={moduleDefinitions.inventory}
          onNavigate={vi.fn()}
        >
          <div>App content</div>
        </AppShell>,
      );
    });

    expect(container.querySelector(".app-shell")).not.toHaveClass(
      "app-shell--compact",
    );
  });

  it("preserves manual collapse preference when entering and leaving forced-collapse pages", async () => {
    const { container, rerender } = render(
      <AppShell activeModule={moduleDefinitions.dashboard} onNavigate={vi.fn()}>
        <div>App content</div>
      </AppShell>,
    );

    await screen.findByText("App content");
    expect(container.querySelector(".app-shell")).not.toHaveClass(
      "app-shell--compact",
    );

    const collapseButton = screen.getAllByRole("button", {
      name: "Recolher sidebar",
    })[0];
    expect(collapseButton).toBeDefined();
    await act(async () => {
      collapseButton?.click();
    });

    expect(container.querySelector(".app-shell")).toHaveClass(
      "app-shell--compact",
    );

    await act(async () => {
      rerender(
        <AppShell activeModule={moduleDefinitions.crm} onNavigate={vi.fn()}>
          <div>App content</div>
        </AppShell>,
      );
    });

    expect(container.querySelector(".app-shell")).toHaveClass(
      "app-shell--compact",
    );

    await act(async () => {
      rerender(
        <AppShell
          activeModule={moduleDefinitions.inventory}
          onNavigate={vi.fn()}
        >
          <div>App content</div>
        </AppShell>,
      );
    });

    expect(container.querySelector(".app-shell")).toHaveClass(
      "app-shell--compact",
    );
  });
});

describe("switchStoreWorkspace", () => {
  afterEach(() => localStorage.clear());

  it("persists only an active accessible store and reloads to clear scoped state", () => {
    const session = createAgencySession();
    persistCurrentStoreSlug("loja-a", session.user.clerkUserId);
    const reload = vi.fn();

    expect(switchStoreWorkspace(session, "loja-b", reload)).toBe(true);
    expect(readCurrentStoreSlug(session.user.clerkUserId)).toBe("loja-b");
    expect(reload).toHaveBeenCalledOnce();
    expect(switchStoreWorkspace(session, "loja-suspensa", reload)).toBe(false);
    expect(switchStoreWorkspace(session, "loja-inexistente", reload)).toBe(
      false,
    );
    expect(switchStoreWorkspace(session, "loja-outra-agencia", reload)).toBe(
      false,
    );
    expect(reload).toHaveBeenCalledOnce();
  });

  it("lists every active same-tenant agency store and excludes other tenants", () => {
    const session = createAgencySession();
    persistCurrentStoreSlug("loja-a", session.user.clerkUserId);

    expect(readStoreWorkspaceState(session)).toMatchObject({
      agencyPortalHref: "/agency/admin",
      workspaces: [
        { id: "loja-a", name: "Loja A" },
        { id: "loja-b", name: "Loja B" },
      ],
    });
  });
});

function createAgencySession(): SessionBootstrap {
  return {
    defaultStore: null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [
      createStore("loja-a", "active"),
      createStore("loja-b", "active"),
      createStore("loja-suspensa", "suspended"),
      createStore("loja-outra-agencia", "active", "tenant-other"),
    ],
    tenantMemberships: [
      {
        role: "agency",
        status: "active",
        tenantId: "tenant-agency",
        tenantName: "Agência",
        tenantSlug: "agencia",
      },
    ],
    user: {
      clerkUserId: "clerk-agency",
      email: "agency@loja.test",
      id: "user-agency",
      name: "Agência",
    },
  };
}

function createStore(
  storeSlug: string,
  status: "active" | "suspended",
  tenantId = "tenant-agency",
): SessionBootstrap["stores"][number] {
  return {
    effectivePermissions: ["crm.conversations.read"],
    role: "agency",
    status,
    storeId: `store-${storeSlug}`,
    storeName: storeSlug === "loja-a" ? "Loja A" : "Loja B",
    storeSlug,
    tenantId,
    tenantName: "Agência",
  };
}

function createSettings({
  profile = {},
  theme = {},
}: {
  profile?: Partial<StoreSettingsSnapshot["profile"]>;
  theme?: Record<string, unknown>;
} = {}): StoreSettingsSnapshot {
  return {
    identity: {
      legalName: "MB Auto legal",
      primaryDomain: null,
      publicSlug: "mb-auto",
      tradingName: "MB Auto",
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
      ...profile,
    },
    publicSite: {
      customDomain: null,
      customDomainStatus: "not_configured",
      heroImageUrl: null,
      isPublished: false,
      layoutKey: "aurora",
      seoDescription: null,
      seoTitle: null,
      theme,
      verificationToken: null,
    },
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

function hex(value: string) {
  return `${"#"}${value}`;
}
