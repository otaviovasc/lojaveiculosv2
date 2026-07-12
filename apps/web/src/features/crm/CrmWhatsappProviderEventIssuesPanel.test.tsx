// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { CrmWhatsappProviderEventIssuesPanel } from "./CrmWhatsappProviderEventIssuesPanel";

describe("CrmWhatsappProviderEventIssuesPanel", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("lists failed events and retries them", async () => {
    const api = createApi();
    const user = userEvent.setup();

    render(<CrmWhatsappProviderEventIssuesPanel api={api} canRetry={true} />);

    expect(
      await screen.findByRole("button", {
        name: /1 evento ZAPI com atenção/i,
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /1 evento/i }));
    await user.click(screen.getByRole("button", { name: "Reprocessar" }));

    expect(api.retryProviderEvent).toHaveBeenCalledWith("event_1");
    await waitFor(() =>
      expect(api.listProviderEventIssues).toHaveBeenCalledTimes(2),
    );
  });

  it("shows failed events without retry actions for read-only users", async () => {
    const api = createApi();
    const user = userEvent.setup();

    render(<CrmWhatsappProviderEventIssuesPanel api={api} canRetry={false} />);

    await user.click(
      await screen.findByRole("button", {
        name: /1 evento ZAPI com atenção/i,
      }),
    );

    expect(screen.getByText("Timeout")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reprocessar" }),
    ).not.toBeInTheDocument();
    expect(api.retryProviderEvent).not.toHaveBeenCalled();
  });
});

function createApi(): CrmWhatsappApi {
  return {
    listProviderEventIssues: vi
      .fn()
      .mockResolvedValueOnce({
        events: [
          {
            attentionReason: "processing_failed",
            connectionId: "connection_1",
            createdAt: "2026-07-03T00:00:00.000Z",
            errorMessage: "Timeout",
            eventType: "crm.whatsapp.zapi.connected",
            id: "event_1",
            processedAt: null,
            providerEventId: "provider_1",
            retryable: true,
            status: "failed",
            updatedAt: "2026-07-03T00:00:00.000Z",
            webhookType: "connected",
          },
        ],
      })
      .mockResolvedValueOnce({ events: [] }),
    retryProviderEvent: vi.fn().mockResolvedValue({
      event: { id: "event_1", status: "processed" },
      result: { status: "accepted" },
    }),
  } as unknown as CrmWhatsappApi;
}
