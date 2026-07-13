// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import { createInventoryDetailFixture } from "../model/inventoryDetail.testSupport";
import type {
  InventoryChecklist,
  InventoryListingDetail,
  UpdateInventoryChecklistInput,
} from "../model/types";
import { DocumentosChecklistCard } from "./DocumentosChecklistCard";
import { deliveryChecklistTemplate } from "./DocumentosChecklistModel";
import { DocumentosRenaveCard } from "./DocumentosRenaveCard";
import { DocumentosUploadCard } from "./DocumentosUploadCard";

afterEach(cleanup);

describe("vehicle document operations", () => {
  it("persists creation and item completion for the delivery checklist", async () => {
    const initial = createInventoryDetailFixture();
    const checklist = createChecklist();
    const created = { ...initial, checklists: [checklist] };
    const completed = {
      ...created,
      checklists: [
        {
          ...checklist,
          items: checklist.items.map((item, index) =>
            index === 0 ? { ...item, status: "passed" as const } : item,
          ),
          status: "in_progress" as const,
        },
      ],
    };
    const api = {
      createChecklist: vi.fn(async () => created),
      updateChecklist: vi.fn(async () => completed),
    } as unknown as InventoryApi;
    const user = userEvent.setup();

    render(<ChecklistHarness api={api} initial={initial} />);
    await user.click(
      screen.getByRole("button", { name: "Criar checklist de entrega" }),
    );

    await waitFor(() =>
      expect(api.createChecklist).toHaveBeenCalledWith("unit_1", {
        items: deliveryChecklistTemplate,
        name: "Checklist de entrega",
        status: "pending",
      }),
    );

    await user.click(screen.getByLabelText("Documentação em dia"));
    await waitFor(() =>
      expect(api.updateChecklist).toHaveBeenCalledWith(
        "unit_1",
        "checklist_1",
        expect.objectContaining({ status: "in_progress" }),
      ),
    );
    expect(screen.getByText("1/7 concluídos")).toBeVisible();
  });

  it("uploads and attaches a real unit document", async () => {
    const initial = createInventoryDetailFixture();
    const stored = {
      ...initial,
      documents: [
        {
          createdAt: "2026-02-01T10:00:00.000Z",
          fileName: "crlv.pdf",
          fileSizeBytes: 3,
          id: "document_1",
          kind: "vehicle_registration" as const,
          linkRole: "vehicle_registration",
          metadata: {},
          mimeType: "application/pdf",
          status: "issued" as const,
          storageKey: "documents/crlv.pdf",
          storeId: "store_1",
          targetId: "unit_1",
          targetType: "vehicle_unit" as const,
          tenantId: "tenant_1",
          title: "crlv.pdf",
          updatedAt: "2026-02-01T10:00:00.000Z",
          uploadedAt: "2026-02-01T10:00:00.000Z",
        },
      ],
    };
    const api = {
      attachUnitDocument: vi.fn(async () => stored),
      requestUnitDocumentUpload: vi.fn(async () => ({
        expiresAt: "2026-02-01T11:00:00.000Z",
        publicUrl: "https://storage.example/crlv.pdf",
        storageKey: "documents/crlv.pdf",
        uploadHeaders: {},
        uploadMethod: "PUT" as const,
        uploadUrl: "https://upload.local/crlv.pdf",
      })),
    } as unknown as InventoryApi;

    render(<UploadHarness api={api} initial={initial} />);
    await userEvent.upload(
      screen.getByLabelText("Enviar"),
      new File(["pdf"], "crlv.pdf", { type: "application/pdf" }),
    );

    await waitFor(() =>
      expect(api.attachUnitDocument).toHaveBeenCalledWith("unit_1", {
        fileName: "crlv.pdf",
        fileSizeBytes: 3,
        kind: "vehicle_registration",
        mimeType: "application/pdf",
        storageKey: "documents/crlv.pdf",
        title: "crlv.pdf",
      }),
    );
    expect(screen.getByText("crlv.pdf")).toBeVisible();
    expect(screen.getByText("Armazenado")).toBeVisible();
  });

  it("rejects an empty document before requesting storage", async () => {
    const initial = createInventoryDetailFixture();
    const api = {
      requestUnitDocumentUpload: vi.fn(),
    } as unknown as InventoryApi;

    render(<UploadHarness api={api} initial={initial} />);
    fireEvent.change(screen.getByLabelText("Enviar"), {
      target: {
        files: [new File([], "empty.pdf", { type: "application/pdf" })],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O arquivo selecionado está vazio.",
    );
    expect(api.requestUnitDocumentUpload).not.toHaveBeenCalled();
  });

  it("unchecks a waived checklist item back to pending", async () => {
    const checklist = createChecklist();
    const waived = {
      ...checklist,
      items: checklist.items.map((item, index) =>
        index === 0 ? { ...item, status: "waived" as const } : item,
      ),
    };
    const initial = {
      ...createInventoryDetailFixture(),
      checklists: [waived],
    };
    const updateChecklist = vi.fn(
      async (
        _unitId: string,
        _checklistId: string,
        _input: UpdateInventoryChecklistInput,
      ) => initial,
    );
    const api = { updateChecklist } as unknown as InventoryApi;

    render(<ChecklistHarness api={api} initial={initial} />);
    await userEvent.click(screen.getByLabelText("Documentação em dia"));

    await waitFor(() => expect(updateChecklist).toHaveBeenCalledOnce());
    expect(updateChecklist.mock.calls[0]?.slice(0, 2)).toEqual([
      "unit_1",
      "checklist_1",
    ]);
    expect(
      updateChecklist.mock.calls[0]?.[2].items?.find(
        (item) => item.id === "item_1",
      ),
    ).toMatchObject({ status: "pending" });
  });

  it("does not expose fabricated RENAVE code or progress", () => {
    render(<DocumentosRenaveCard />);

    expect(screen.getByText("Indisponível")).toBeVisible();
    expect(screen.getByText(/não existe integração RENAVE/i)).toBeVisible();
    expect(screen.queryByText("REV-82947118")).toBeNull();
    expect(screen.queryByRole("button", { name: /RENAVE/i })).toBeNull();
  });
});

function ChecklistHarness({
  api,
  initial,
}: {
  api: InventoryApi;
  initial: InventoryListingDetail;
}) {
  const [detail, setDetail] = useState(initial);
  return (
    <DocumentosChecklistCard
      api={api}
      detail={detail}
      onUpdated={setDetail}
      unit={detail.units[0] ?? null}
    />
  );
}

function UploadHarness({
  api,
  initial,
}: {
  api: InventoryApi;
  initial: InventoryListingDetail;
}) {
  const [detail, setDetail] = useState(initial);
  return (
    <DocumentosUploadCard
      api={api}
      detail={detail}
      onUpdated={setDetail}
      unit={detail.units[0] ?? null}
    />
  );
}

function createChecklist(): InventoryChecklist {
  return {
    completedAt: null,
    completedByUserId: null,
    createdAt: "2026-02-01T10:00:00.000Z",
    id: "checklist_1",
    items: deliveryChecklistTemplate.map((item, index) => ({
      id: `item_${index + 1}`,
      label: item.label,
      notes: null,
      status: "pending",
    })),
    name: "Checklist de entrega",
    status: "pending",
    storeId: "store_1",
    tenantId: "tenant_1",
    unitId: "unit_1",
    updatedAt: "2026-02-01T10:00:00.000Z",
  };
}
