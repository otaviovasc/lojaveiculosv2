// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmConnectionFilter } from "./CrmConnectionFilter";
import type { CrmProviderConnection } from "./crmConversationTypes";

describe("CrmConnectionFilter", () => {
  afterEach(cleanup);

  it("does not visually select the only connection without a persisted route", () => {
    render(
      <CrmConnectionFilter
        connectionFilterId={null}
        connections={[connection(false)]}
        fallbackConnectionId={null}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Filtrar por conexão" }),
    ).toHaveAttribute("title", "Canal: Nenhum canal pronto");
  });

  it("shows the only connection when the backend marks it as default", () => {
    render(
      <CrmConnectionFilter
        connectionFilterId={null}
        connections={[connection(true)]}
        fallbackConnectionId={null}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Filtrar por conexão" }),
    ).toHaveAttribute("title", "Canal: WhatsApp");
  });

  it("offers an aggregate option selected by default when multiple connections are browsable", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CrmConnectionFilter
        connectionFilterId={null}
        connections={[
          connection(true),
          connection(false, {
            displayName: "Secundária",
            id: "connection-2",
          }),
        ]}
        fallbackConnectionId={null}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Filtrar por conexão" }),
    ).toHaveAttribute("title", "Canal: Todas as conexões");

    await user.click(
      screen.getByRole("button", { name: "Filtrar por conexão" }),
    );
    const aggregate = screen.getByRole("option", {
      name: /Todas as conexões/,
    });
    expect(aggregate).toHaveAttribute("aria-selected", "true");

    await user.click(
      screen.getByRole("option", { name: /WhatsApp.*Secundária/ }),
    );
    expect(onChange).toHaveBeenCalledWith("connection-2");
  });

  it("selecting the aggregate option reports null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CrmConnectionFilter
        connectionFilterId="connection-1"
        connections={[
          connection(true),
          connection(false, {
            displayName: "Secundária",
            id: "connection-2",
          }),
        ]}
        fallbackConnectionId={null}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Filtrar por conexão" }),
    );
    await user.click(screen.getByRole("option", { name: /Todas as conexões/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows the connection phone number in the option sub-label when present", async () => {
    const user = userEvent.setup();
    render(
      <CrmConnectionFilter
        connectionFilterId="connection-1"
        connections={[
          connection(true),
          {
            ...connection(false, {
              displayName: "Secundária",
              id: "connection-2",
            }),
            phoneNumber: "+55 11 4002-8922",
          } as CrmProviderConnection,
        ]}
        fallbackConnectionId={null}
        onChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Filtrar por conexão" }),
    );
    expect(
      screen.getByRole("option", { name: /WhatsApp.*4002-8922/ }),
    ).toBeInTheDocument();
  });

  it("restricts member-restricted agents to their member connections", async () => {
    const user = userEvent.setup();
    const memberConnection = {
      ...connection(true),
      memberUserIds: ["user-current"],
    } as CrmProviderConnection;
    const otherConnection = {
      ...connection(false, { displayName: "Secundária", id: "connection-2" }),
      memberUserIds: ["user-other"],
    } as CrmProviderConnection;
    render(
      <CrmConnectionFilter
        canAssign={false}
        canReadUnassigned={false}
        connectionFilterId={null}
        connections={[memberConnection, otherConnection]}
        currentUserId="user-current"
        fallbackConnectionId={null}
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Filtrar por conexão" });
    // Only one browsable connection remains: no aggregate option, no dropdown.
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("title", "Canal: WhatsApp");
  });

  it("member-restricted agents still see the aggregate option across several member connections", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const connections = [
      { ...connection(true), memberUserIds: ["user-current"] },
      {
        ...connection(false, { displayName: "Secundária", id: "connection-2" }),
        memberUserIds: ["user-current"],
      },
      {
        ...connection(false, { displayName: "Restrita", id: "connection-3" }),
        memberUserIds: ["user-other"],
      },
    ] as CrmProviderConnection[];
    render(
      <CrmConnectionFilter
        canAssign={false}
        canReadUnassigned={false}
        connectionFilterId={null}
        connections={connections}
        currentUserId="user-current"
        fallbackConnectionId={null}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Filtrar por conexão" }),
    );
    expect(
      screen.getByRole("option", { name: /Todas as conexões/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Restrita/ })).toBeNull();
  });

  it("connections without a member list stay hidden from member-restricted agents", () => {
    render(
      <CrmConnectionFilter
        canAssign={false}
        canReadUnassigned={false}
        connectionFilterId={null}
        connections={[connection(true)]}
        currentUserId="user-current"
        fallbackConnectionId={null}
        onChange={vi.fn()}
        onSetup={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Filtrar por conexão" }),
    ).toHaveAttribute("title", "Nenhum canal pronto. Configure uma conexão.");
  });
});

function connection(
  isDefault: boolean,
  overrides: Partial<CrmProviderConnection> = {},
): CrmProviderConnection {
  return {
    channel: "whatsapp",
    displayName: "Z-API principal",
    externalConnectionId: "instance-1",
    externalInstanceId: "instance-1",
    id: "connection-1",
    isDefault,
    live: {
      checkedAt: "2026-08-17T12:00:00.000Z",
      connected: true,
      connectedPhone: "+5511999990000",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    phone: "+5511999990000",
    provider: "zapi",
    readiness: { ready: true, reason: null, reasonCode: "ready" },
    ready: true,
    state: "active",
    status: "active",
    webhookUrl: "https://api.example/webhook",
    ...overrides,
  };
}
