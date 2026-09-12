// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmProviderConnection } from "./crmConversationTypes";
import { CrmConnectionMembersSection } from "./CrmConnectionMembersSection";

vi.mock("./useCrmAssignableMembers", () => ({
  useCrmAssignableMembers: () => ({
    assignableMembers: [
      {
        email: "ana@loja.test",
        id: 1,
        isActive: true,
        name: "Ana",
        role: "OWNER",
        seeUnassignedChats: true,
      },
      {
        email: "bia@loja.test",
        id: 2,
        isActive: true,
        name: "Bia",
        role: "MEMBER",
        seeUnassignedChats: false,
      },
    ],
    canAssignSessions: true,
  }),
}));

describe("CrmConnectionMembersSection", () => {
  afterEach(cleanup);

  it("lists members resolved against assignable members of the store", async () => {
    render(
      <CrmConnectionMembersSection
        canManage
        connection={createConnection({ memberUserIds: ["1"] })}
        onListConnectionMembers={vi.fn(async () => [
          {
            createdAt: "2026-08-25T12:00:00.000Z",
            grantedBy: null,
            userId: "1",
          },
        ])}
      />,
    );

    expect(await screen.findByText("Ana")).toBeVisible();
    expect(screen.getByText("ana@loja.test")).toBeVisible();
    expect(screen.queryByText("Bia")).not.toBeInTheDocument();
  });

  it("grants access only after the server confirms and refreshes", async () => {
    const onListConnectionMembers = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { createdAt: "2026-08-25T12:00:00.000Z", grantedBy: null, userId: "2" },
      ]);
    const onGrantConnectionMember = vi.fn(async () => undefined);
    render(
      <CrmConnectionMembersSection
        canManage
        connection={createConnection({ memberUserIds: [] })}
        onGrantConnectionMember={onGrantConnectionMember}
        onListConnectionMembers={onListConnectionMembers}
      />,
    );

    expect(
      await screen.findByText(/Nenhum atendente vinculado/i),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Atendente para liberar acesso" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: "Bia" }));
    fireEvent.click(screen.getByRole("button", { name: /Liberar acesso/ }));

    await waitFor(() =>
      expect(onGrantConnectionMember).toHaveBeenCalledWith(
        "connection-uazapi",
        "2",
      ),
    );
    expect(await screen.findByText("Bia")).toBeVisible();
    expect(onListConnectionMembers).toHaveBeenCalledTimes(2);
  });

  it("revokes access and refreshes from the server", async () => {
    const onListConnectionMembers = vi
      .fn()
      .mockResolvedValueOnce([
        { createdAt: "2026-08-25T12:00:00.000Z", grantedBy: null, userId: "1" },
      ])
      .mockResolvedValueOnce([]);
    const onRevokeConnectionMember = vi.fn(async () => ({
      activeAssignedConversationCount: 0,
      revoked: true,
    }));
    render(
      <CrmConnectionMembersSection
        canManage
        connection={createConnection({ memberUserIds: ["1"] })}
        onListConnectionMembers={onListConnectionMembers}
        onRevokeConnectionMember={onRevokeConnectionMember}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Remover acesso de Ana" }),
    );

    await waitFor(() =>
      expect(onRevokeConnectionMember).toHaveBeenCalledWith(
        "connection-uazapi",
        "1",
      ),
    );
    expect(
      await screen.findByText(/Nenhum atendente vinculado/i),
    ).toBeVisible();
  });

  it("keeps grant failures honest without changing the list", async () => {
    const onGrantConnectionMember = vi.fn(async () => {
      throw new Error("forbidden");
    });
    render(
      <CrmConnectionMembersSection
        canManage
        connection={createConnection({ memberUserIds: [] })}
        onGrantConnectionMember={onGrantConnectionMember}
        onListConnectionMembers={vi.fn(async () => [])}
      />,
    );

    await screen.findByText(/Nenhum atendente vinculado/i);
    fireEvent.click(
      screen.getByRole("button", { name: "Atendente para liberar acesso" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: "Bia" }));
    fireEvent.click(screen.getByRole("button", { name: /Liberar acesso/ }));

    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByText(/Nenhum atendente vinculado/i)).toBeVisible();
  });

  it("hides mutation controls without the setup permission", async () => {
    render(
      <CrmConnectionMembersSection
        canManage={false}
        connection={createConnection({ memberUserIds: ["1"] })}
        onGrantConnectionMember={vi.fn()}
        onListConnectionMembers={vi.fn(async () => [
          {
            createdAt: "2026-08-25T12:00:00.000Z",
            grantedBy: null,
            userId: "1",
          },
        ])}
        onRevokeConnectionMember={vi.fn()}
      />,
    );

    expect(await screen.findByText("Ana")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Remover acesso/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Atendente para liberar acesso"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/administrador da loja/i)).toBeVisible();
  });
});

function createConnection(
  overrides: Partial<CrmProviderConnection> = {},
): CrmProviderConnection {
  return {
    channel: "whatsapp",
    displayName: "WhatsApp da loja",
    id: "connection-uazapi",
    provider: "uazapi",
    state: "active",
    status: "active",
    ...overrides,
  };
}
