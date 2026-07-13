// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappScheduleMessageDialog } from "./CrmWhatsappScheduleMessageDialog";

afterEach(cleanup);

describe("CrmWhatsappScheduleMessageDialog", () => {
  it("uses the shared modal layer outside the embedded page", async () => {
    const callbacks = createCallbacks();
    render(<CrmWhatsappScheduleMessageDialog {...baseProps} {...callbacks} />);

    const dialog = await screen.findByRole("dialog", {
      name: "Agendamentos WhatsApp",
    });
    expect(dialog).toHaveClass("crm-whatsapp-action-panel");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(callbacks.onClose).toHaveBeenCalledOnce();
  });

  it("preserves the non-modal embedded region", () => {
    render(
      <CrmWhatsappScheduleMessageDialog
        {...baseProps}
        {...createCallbacks()}
        embedded
      />,
    );

    expect(
      screen.getByRole("region", { name: "Agendamentos WhatsApp" }),
    ).toHaveClass("crm-whatsapp-action-embedded");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

const baseProps = {
  canCancel: false,
  canCreate: false,
  canProcess: false,
  canRead: false,
  disabled: false,
};

function createCallbacks() {
  return {
    onCancel: vi.fn(async () => true),
    onClose: vi.fn(),
    onList: vi.fn(async () => []),
    onProcessDue: vi.fn(async () => true),
    onSchedule: vi.fn(async () => true),
  };
}
