// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  readStorefrontAppearanceMode,
  StorefrontThemeToggle,
  useStorefrontAppearance,
} from "./StorefrontAppearance";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("storefront appearance", () => {
  it("keeps existing tenants on light mode by default", () => {
    expect(readStorefrontAppearanceMode({})).toBe("light");
    expect(readStorefrontAppearanceMode({ appearanceMode: "unknown" })).toBe(
      "light",
    );
  });

  it("persists the visitor choice when both appearances are enabled", () => {
    render(<AppearanceHarness />);

    const toggle = screen.getByRole("button", { name: "Usar tema escuro" });
    fireEvent.click(toggle);

    expect(screen.getByTestId("scheme")).toHaveTextContent("dark");
    expect(
      localStorage.getItem("lojaveiculosv2:storefront-color-scheme:demo"),
    ).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Usar tema claro" }),
    ).toBeInTheDocument();
  });
});

function AppearanceHarness() {
  const appearance = useStorefrontAppearance({
    mode: "both",
    storeSlug: "demo",
  });
  return (
    <>
      <span data-testid="scheme">{appearance.scheme}</span>
      <StorefrontThemeToggle
        onToggle={appearance.toggle}
        scheme={appearance.scheme}
      />
    </>
  );
}
