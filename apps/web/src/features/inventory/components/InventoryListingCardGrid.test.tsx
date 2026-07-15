// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInventoryListingSummary } from "../model/inventoryListingSummary.testSupport";
import {
  InventoryListingCardGrid,
  MercosulPlateBadge,
} from "./InventoryListingCardGrid";

afterEach(cleanup);

describe("InventoryListingCardGrid", () => {
  it("renders vehicle photos as a full-width 4:3 card cover", () => {
    render(
      <InventoryListingCardGrid
        items={[createInventoryListingSummary("listing_1")]}
        onSelect={vi.fn()}
      />,
    );

    const image = screen.getByRole("img", { name: "Toyota Corolla XEI" });
    const card = image.closest("article");
    const photoGradients = image.parentElement?.querySelectorAll(
      "[data-photo-gradient]",
    );
    const hoverOverlay = image.parentElement?.querySelector(
      "[data-card-hover-overlay]",
    );

    expect(card).toHaveClass("!p-0");
    expect(image).toHaveClass(
      "block",
      "h-full",
      "w-full",
      "object-cover",
      "group-hover:blur-[2px]",
    );
    expect(image.parentElement).toHaveClass("aspect-[4/3]", "w-full");
    expect(hoverOverlay).not.toHaveClass("backdrop-blur-[2px]");
    expect(photoGradients).toHaveLength(2);
    expect(photoGradients?.[0]).toHaveClass(
      "bg-gradient-to-t",
      "from-black/50",
      "to-white/10",
    );
    expect(photoGradients?.[1]).toHaveClass(
      "bg-gradient-to-br",
      "from-accent/20",
      "mix-blend-soft-light",
    );
  });
});

describe("MercosulPlateBadge", () => {
  it("keeps the Brasil strip below one third of the plate height", () => {
    render(<MercosulPlateBadge plate="abc-1d23" />);

    const plate = screen.getByLabelText("Placa ABC1D23");
    const countryStrip = screen.getByText("Brasil");
    const number = screen.getByText("ABC1D23");

    expect(plate).toHaveClass("h-7");
    expect(countryStrip.parentElement).toHaveClass("h-2");
    expect(countryStrip).toHaveClass("scale-50", "text-xs");
    expect(number).toHaveClass("h-5");
  });
});
