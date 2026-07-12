// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FiscalApi } from "./apiClient";
import { FiscalModule } from "./FiscalModule";

vi.mock("../../components/ui/AnimatedContent", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

vi.stubGlobal(
  "IntersectionObserver",
  class {
    disconnect() {}
    observe() {}
    unobserve() {}
  },
);

describe("FiscalModule", () => {
  afterEach(cleanup);

  it("uses semantic labels and blocks emission while configuration is missing", async () => {
    const api = createApi();
    render(<FiscalModule api={api} />);

    expect(
      await screen.findByRole("heading", { name: "Operação fiscal", level: 1 }),
    ).toBeVisible();
    expect(screen.getByText("Integração fiscal incompleta")).toBeVisible();
    expect(screen.getByText("Credencial de acesso à Spedy")).toBeVisible();
    expect(screen.getByText("NF-e de venda de veículo")).toBeVisible();
    expect(screen.getByText("Emitida")).toBeVisible();
    expect(screen.queryByText("SPEDY_API_TOKEN")).not.toBeInTheDocument();
    expect(screen.queryByText("spedy_private_123")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Emitir NF-e" }),
    ).not.toBeInTheDocument();
    expect(api.issueDocument).not.toHaveBeenCalled();
  });

  it("reviews an explicit operation reference before issuing", async () => {
    const api = createApi(true);
    const user = userEvent.setup();
    render(<FiscalModule api={api} />);

    const reference = await screen.findByRole("textbox", {
      name: "Operação de origem",
    });
    const issueButton = screen.getByRole("button", { name: "Emitir NF-e" });
    expect(issueButton).toBeDisabled();

    await user.type(reference, "venda 1042");
    await user.click(issueButton);

    expect(api.issueDocument).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Revisar antes de emitir" }),
    ).toBeVisible();
    expect(screen.getByText("venda 1042")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Confirmar emissão" }));

    expect(api.issueDocument).toHaveBeenCalledWith({
      documentType: "nfe_vehicle_sale",
      externalReference: "venda 1042",
    });
  });
});

function createApi(configured = false): FiscalApi {
  return {
    getOverview: vi.fn(async () => ({
      documents: [
        {
          accessKey: null,
          createdAt: "2026-07-11T12:00:00.000Z",
          documentType: "nfe_vehicle_sale",
          id: "fiscal_1",
          issuedAt: "2026-07-11T12:00:00.000Z",
          metadata: {},
          provider: "spedy" as const,
          providerDocumentId: "spedy_private_123",
          status: "issued" as const,
        },
      ],
      provider: {
        configured,
        missingConfiguration: configured ? [] : ["SPEDY_API_TOKEN"],
        provider: "spedy" as const,
        webhookConfigured: configured,
      },
      summary: { cancelled: 0, failed: 0, issued: 1, pending: 0 },
    })),
    issueDocument: vi.fn(async () => ({
      accessKey: null,
      createdAt: "2026-07-11T12:00:00.000Z",
      documentType: "nfe_vehicle_sale",
      id: "fiscal_new",
      issuedAt: null,
      metadata: {},
      provider: "spedy" as const,
      providerDocumentId: null,
      status: "draft" as const,
    })),
  };
}
