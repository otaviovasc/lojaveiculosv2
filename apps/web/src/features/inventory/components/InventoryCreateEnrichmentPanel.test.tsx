// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import { createInitialInventoryForm } from "../model/formModel";
import { InventoryCreateEnrichmentPanel } from "./InventoryCreateEnrichmentPanel";

describe("InventoryCreateEnrichmentPanel", () => {
  it("shows friendly API errors with request ids", async () => {
    const user = userEvent.setup();
    const api = {
      lookupPlate: vi.fn(async () => {
        throw new AppApiError({
          code: "HTTP_AUTHENTICATION_REQUIRED",
          message:
            "Authenticated HTTP context requires Clerk user and store slug",
          requestId: "req_plate_lookup",
          status: 401,
        });
      }),
    } as unknown as InventoryApi;

    render(
      <InventoryCreateEnrichmentPanel
        api={api}
        form={{ ...createInitialInventoryForm(), plate: "ABC1D23" }}
        onLookupComplete={vi.fn()}
        onSetFormDirect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Consultar placa" }));

    expect(
      await screen.findByText(
        "Sua sessao ou loja ativa nao foi identificada. Entre novamente ou selecione a loja.",
      ),
    ).toBeVisible();
    expect(screen.getByText("ID do erro: req_plate_lookup")).toBeVisible();
  });
});
