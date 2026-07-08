// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappConnectionAdmin } from "./CrmWhatsappConnectionAdmin";
import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";

describe("CrmWhatsappConnectionAdmin", () => {
  afterEach(() => cleanup());

  it("saves only the write-only ZAPI instance values", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(async () => true);
    const { container } = render(
      <CrmWhatsappConnectionAdmin
        connections={[createConnection()]}
        onRefresh={vi.fn(async () => undefined)}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByText("WhatsApp (ZAPI)")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("old-secret")).not.toBeInTheDocument();
    expect(
      container.querySelectorAll(
        ".crm-whatsapp-connection-instance-card input:not([readonly])",
      ),
    ).toHaveLength(2);
    expect(screen.getByLabelText("Token da instancia")).toHaveAttribute(
      "type",
      "password",
    );
    await user.clear(screen.getByLabelText("ID da instancia"));
    await user.type(screen.getByLabelText("ID da instancia"), "zapi-new");
    await user.type(
      screen.getByLabelText("Token da instancia"),
      "zapi-new-token",
    );
    await user.click(screen.getByRole("button", { name: "Salvar instancia" }));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith("connection_1", {
        instanceCredentials: {
          instanceId: "zapi-new",
          instanceToken: "zapi-new-token",
        },
      }),
    );
  });
});

function createConnection(): CrmWhatsappProviderConnection {
  return {
    credentials: {
      apiBaseUrlEnv: null,
      clientTokenEnv: null,
      instanceIdEnv: null,
      instanceTokenEnv: null,
      mode: "stored",
      storedInstanceConfigured: true,
    },
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: "zapi-old",
    id: "connection_1",
    live: {
      checkedAt: "2026-07-06T12:00:00.000Z",
      connected: true,
      connectedPhone: "5511940231407",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    metadata: {
      catalogPhone: null,
      connectedPhone: null,
      migrationUnit: null,
      purpose: null,
    },
    phone: "5511940231407",
    provider: "zapi",
    status: "active",
    webhookEndpoints: [],
    webhookTokenRequired: false,
    webhookUrl: null,
  };
}
