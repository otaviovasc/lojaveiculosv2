// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsApi } from "./apiClient";
import { SettingsModule } from "./SettingsModule";

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
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Configurações da loja" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText("Configurações indisponíveis"),
    ).toBeVisible();
    expect(screen.getByText(/Nenhuma alteração foi aplicada/)).toBeVisible();
  });
});

function createUnavailableApi(): SettingsApi {
  return {
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
