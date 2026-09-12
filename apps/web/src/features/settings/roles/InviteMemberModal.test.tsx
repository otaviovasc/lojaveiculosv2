// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InviteMemberModal } from "./InviteMemberModal";

describe("InviteMemberModal", () => {
  it("describes Clerk acceptance truthfully and offers the secure link", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const onInvite = vi.fn(async () => ({
      acceptUrl: "https://example.accounts.dev/invitation_1",
      email: "seller@example.com",
      emailDeliveryStatus: "requested" as const,
      id: "invitation_1",
      role: "salesman" as const,
      status: "sent" as const,
      storeId: "store_1",
      tenantId: "tenant_1",
    }));

    render(
      <InviteMemberModal
        availableRoles={[{ label: "Vendedor", role: "salesman" }]}
        isOpen
        onClose={vi.fn()}
        onInvite={onInvite}
        onResendInvitation={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("exemplo@email.com"), {
      target: { value: "seller@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));

    expect(
      await screen.findByText(/O Clerk aceitou a solicitação de envio/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/enviado com sucesso/i)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Copiar link de acesso" }),
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "https://example.accounts.dev/invitation_1",
      ),
    );
  });
});
