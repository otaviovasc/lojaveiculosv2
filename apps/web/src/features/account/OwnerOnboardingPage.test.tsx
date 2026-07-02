// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as ReactRouterDom from "react-router-dom";
import { OwnerOnboardingPage } from "./OwnerOnboardingPage";

type OwnerStoreApi = {
  createOwnerStore: (input: unknown) => Promise<unknown>;
};

const mocks = vi.hoisted(() => ({
  createOwnerStore: vi.fn<(input: unknown) => Promise<unknown>>(),
  createRuntimeAccountApi: vi.fn<() => Promise<OwnerStoreApi>>(),
  navigate: vi.fn<(to: string, options?: { replace?: boolean }) => void>(),
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ userId: "user_1" }),
}));

vi.mock("./runtimeApi", () => ({
  createRuntimeAccountApi: () => mocks.createRuntimeAccountApi(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

describe("OwnerOnboardingPage", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    mocks.createOwnerStore.mockReset();
    mocks.createRuntimeAccountApi.mockReset();
    mocks.navigate.mockReset();
  });

  it("refreshes the Clerk session bootstrap after creating the first store", async () => {
    const user = userEvent.setup();
    mocks.createOwnerStore.mockResolvedValue({
      role: "owner",
      storeId: "store_1",
      storeName: "Otavio Veiculos",
      storeSlug: "otavio-veiculos",
      tenantId: "tenant_1",
      tenantName: "Otavio Veiculos",
    });
    mocks.createRuntimeAccountApi.mockResolvedValue({
      createOwnerStore: mocks.createOwnerStore,
    });

    render(
      <ReactRouterDom.MemoryRouter>
        <OwnerOnboardingPage />
      </ReactRouterDom.MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Nome comercial"), "Otavio Veiculos");
    await user.click(screen.getByRole("button", { name: "Criar loja" }));

    expect(mocks.createOwnerStore).toHaveBeenCalledWith(
      expect.objectContaining({
        publicSlug: "otavio-veiculos",
        storeTradingName: "Otavio Veiculos",
      }),
    );
    expect(mocks.navigate).toHaveBeenCalledWith("/auth/session", {
      replace: true,
    });
  });
});
