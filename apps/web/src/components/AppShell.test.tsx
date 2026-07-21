// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { moduleDefinitions } from "../app/moduleDefinitions";
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
