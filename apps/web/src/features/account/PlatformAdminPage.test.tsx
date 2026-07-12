// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlatformAdminPage } from "./PlatformAdminPage";

const mocks = vi.hoisted(() => ({
  createAgency: vi.fn(),
}));

vi.mock("./runtimeApi", () => ({
  createRuntimeAccountApi: async () => ({
    createAgency: mocks.createAgency,
  }),
}));

describe("PlatformAdminPage", () => {
  afterEach(() => {
    cleanup();
    mocks.createAgency.mockReset();
  });

  it("does not silently discard an operator name without an email", async () => {
    const user = userEvent.setup();
    render(<PlatformAdminPage />);

    await user.type(screen.getByLabelText("Nome da agência"), "Rede Sul");
    await user.type(screen.getByLabelText("Nome do operador"), "Ana Lima");
    await user.click(screen.getByRole("button", { name: "Criar agência" }));

    expect(mocks.createAgency).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Informe o e-mail para identificar o primeiro operador.",
      ),
    ).toBeVisible();
  });
});
