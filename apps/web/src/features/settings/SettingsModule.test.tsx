// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsApi } from "./apiClient";
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
