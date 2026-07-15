// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import { createInventoryDetailFixture } from "../model/inventoryDetail.testSupport";
import { InventoryDetailWorkspace } from "./InventoryDetailWorkspace";

afterEach(cleanup);

describe("InventoryDetailWorkspace", () => {
  it("uses the shared application content boundary", () => {
    render(
      <InventoryDetailWorkspace
        api={{} as InventoryApi}
        detail={createInventoryDetailFixture()}
        onBack={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    expect(screen.getByRole("main")).toHaveClass("dashboard-main");
    expect(screen.getByRole("main")).not.toHaveClass("max-w-7xl");
  });
});
