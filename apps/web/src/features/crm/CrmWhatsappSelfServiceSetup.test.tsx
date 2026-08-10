// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CrmWhatsappSelfServiceSetup,
  type CrmWhatsappSelfServiceHandlers,
} from "./CrmWhatsappSelfServiceSetup";

describe("CrmWhatsappSelfServiceSetup", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it("routes Z-API contracting to billing without collecting credentials", () => {
    const handlers = createHandlers();
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 1, remaining: 1, used: 0 }}
        availableProviders={["zapi"]}
        canManage
        handlers={handlers}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Z-API/i }));
    expect(
      screen.getByText(/programada para o próximo vencimento/i),
    ).toBeVisible();
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver assinatura" }));
    expect(window.location.hash).toBe("#/billing");
    expect(handlers.onCreate).not.toHaveBeenCalled();
  });

  it("blocks creation when the server-owned allowance is exhausted", () => {
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        availableProviders={[]}
        canManage
        handlers={createHandlers()}
      />,
    );

    expect(screen.getByText(/limite de 1 conexão foi atingido/i)).toBeVisible();
  });

  it("shows included Instagram as support-assisted without inventing OAuth", () => {
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 2, remaining: 2, used: 0 }}
        availableProviders={["composio_whatsapp"]}
        canManage
        handlers={createHandlers()}
      />,
    );

    expect(screen.getByText("Instagram incluído")).toBeVisible();
    expect(screen.getByText(/sem custo adicional no CRM/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Pedir ajuda para configurar" }),
    ).toHaveAttribute("href", expect.stringContaining("5511940231407"));
  });
});

function createHandlers(): CrmWhatsappSelfServiceHandlers {
  return {
    onAuthorizeComposio: vi.fn(),
    onCompleteComposio: vi.fn(),
    onCreate: vi.fn(async () => null),
    onRefreshConnections: vi.fn(async () => undefined),
    onSelectComposioSender: vi.fn(),
  };
}
