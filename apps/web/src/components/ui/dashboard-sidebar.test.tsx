// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Circle } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardSidebar } from "./dashboard-sidebar";

describe("DashboardSidebar theme", () => {
  afterEach(cleanup);

  it.each([
    ["light", "/icons/lv-logo-black-red.svg"],
    ["dark", "/icons/lv-logo-white-red.svg"],
  ] as const)("uses the matching %s logo treatment", (theme, expectedLogo) => {
    render(
      <DashboardSidebar
        activeId="dashboard"
        items={[{ icon: Circle, id: "dashboard", title: "Início" }]}
        onSelect={vi.fn()}
        onThemeToggle={vi.fn()}
        theme={theme}
        workspaceName="Loja Teste"
      />,
    );

    expect(
      screen.getAllByRole("img", { name: "Loja Teste" })[0],
    ).toHaveAttribute("src", expectedLogo);
    expect(
      document.querySelector(".workspace-sidebar__texture"),
    ).toBeInTheDocument();
  });

  it("applies compact structure and alignment styles to theme control when sidebar is collapsed", () => {
    render(
      <DashboardSidebar
        activeId="dashboard"
        collapsed={true}
        items={[{ icon: Circle, id: "dashboard", title: "Início" }]}
        onCollapsedChange={vi.fn()}
        onSelect={vi.fn()}
        onThemeToggle={vi.fn()}
        theme="light"
        workspaceName="Loja Teste"
      />,
    );

    const themeButton = screen.getByRole("button", {
      name: "Alternar para tema escuro",
    });
    expect(themeButton).toHaveClass("workspace-sidebar__footer-button");
    expect(themeButton).toHaveClass("is-compact");
    expect(themeButton).not.toHaveTextContent("Tema Escuro");

    const footerActions = themeButton.closest(
      ".workspace-sidebar__footer-actions",
    );
    expect(footerActions).toHaveClass("is-compact");

    const collapseButton = screen.getByRole("button", {
      name: "Expandir sidebar",
    });
    expect(collapseButton).toHaveClass("workspace-sidebar__collapse-button");
    expect(collapseButton).toHaveClass("is-compact");
  });

  it("switches between real stores and exposes the agency return path", () => {
    const onWorkspaceSelect = vi.fn();
    render(
      <DashboardSidebar
        activeId="dashboard"
        agencyPortalHref="/agency/admin"
        items={[{ icon: Circle, id: "dashboard", title: "Início" }]}
        onSelect={vi.fn()}
        onThemeToggle={vi.fn()}
        onWorkspaceSelect={onWorkspaceSelect}
        theme="light"
        workspaceId="loja-a"
        workspaceName="Loja A"
        workspaces={[
          { id: "loja-a", meta: "Agência", name: "Loja A" },
          { id: "loja-b", meta: "Agência", name: "Loja B" },
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Voltar à agência" }),
    ).toHaveAttribute("href", "/agency/admin");
    fireEvent.click(screen.getByRole("button", { name: /Loja A/ }));
    expect(
      screen.getByRole("menu", { name: "Lojas disponíveis" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Loja B/ }));

    expect(onWorkspaceSelect).toHaveBeenCalledWith("loja-b");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("keeps store switching and agency return available when compact", () => {
    render(
      <DashboardSidebar
        activeId="crm"
        agencyPortalHref="/agency/admin"
        collapsed
        items={[{ icon: Circle, id: "crm", title: "CRM" }]}
        onSelect={vi.fn()}
        onThemeToggle={vi.fn()}
        onWorkspaceSelect={vi.fn()}
        theme="light"
        workspaceId="loja-a"
        workspaceName="Loja A"
        workspaces={[
          { id: "loja-a", name: "Loja A" },
          { id: "loja-b", name: "Loja B" },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Trocar loja. Atual: Loja A" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar à agência" }),
    ).toBeInTheDocument();
  });

  it("moves focus through a two-store picker and restores the trigger on Escape", () => {
    render(
      <DashboardSidebar
        activeId="dashboard"
        items={[{ icon: Circle, id: "dashboard", title: "Início" }]}
        onSelect={vi.fn()}
        onThemeToggle={vi.fn()}
        onWorkspaceSelect={vi.fn()}
        theme="light"
        workspaceId="loja-a"
        workspaceName="Loja A"
        workspaces={[
          { id: "loja-a", name: "Loja A" },
          { id: "loja-b", name: "Loja B" },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Loja A/ });
    fireEvent.click(trigger);
    const [first, second] = screen.getAllByRole("menuitemradio");
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("tabindex", "0");
    expect(second).toHaveAttribute("tabindex", "-1");
    expect(
      document.querySelector(".workspace-sidebar__picker-backdrop"),
    ).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(first!, { key: "ArrowDown" });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(second!, { key: "Home" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first!, { key: "End" });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second!, { key: "ArrowDown" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first!, { key: "ArrowUp" });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second!, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
