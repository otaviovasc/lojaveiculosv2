import { describe, expect, it } from "vitest";
import {
  createInitialInventoryForm,
  createInventoryFlowInput,
} from "./formModel";
import { nullableRichTextDescription } from "./richTextDescription";

describe("inventory rich text description", () => {
  it("keeps markdown-like structure in the create listing payload", () => {
    const description = "\n**negrito** 🚗\r\n\r\nLinha com detalhe\n";
    const input = createInventoryFlowInput(
      {
        ...createInitialInventoryForm(),
        colorName: "white",
        description,
        mileageKm: "12000",
        title: "Inventory title",
      },
      null,
    );

    expect(input.listing.description).toBe(
      "\n**negrito** 🚗\n\nLinha com detalhe\n",
    );
  });

  it("stores blank-only rich text as null", () => {
    expect(nullableRichTextDescription(" \r\n \n ")).toBeNull();
  });
});
