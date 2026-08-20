// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VehicleSupplier } from "../model/types";
import { SupplierSummaryCard } from "./SupplierSummaryCard";

afterEach(cleanup);

describe("SupplierSummaryCard", () => {
  it("exposes a clear edit action", () => {
    const onEdit = vi.fn();
    const supplier: VehicleSupplier = {
      createdAt: "2026-08-20T12:00:00.000Z",
      displayName: "Fornecedor Centro",
      documentNumber: null,
      email: null,
      externalProviderId: null,
      id: "supplier-1",
      kind: "provider",
      metadata: {},
      phone: null,
      provider: null,
      storeId: "store-1",
      tenantId: "tenant-1",
      updatedAt: "2026-08-20T12:00:00.000Z",
    };

    render(<SupplierSummaryCard onEdit={onEdit} supplier={supplier} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar fornecedor" }));

    expect(onEdit).toHaveBeenCalledOnce();
  });
});
