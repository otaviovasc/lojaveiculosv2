// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentBuilderBlocks } from "./DocumentBuilderBlocks";
import type { DocumentTemplateBlock } from "./types";

afterEach(cleanup);

describe("DocumentBuilderBlocks", () => {
  it("exposes stable block types for token-based styling", () => {
    const blocks = [
      { id: "heading", text: "Contrato", type: "heading" },
      { body: "Cláusula", id: "clause", type: "clause" },
      {
        fields: [{ label: "Comprador", token: "{{buyer.name}}" }],
        id: "fields",
        title: "Dados",
        type: "field_grid",
      },
      { columns: ["Item"], id: "table", title: "Itens", type: "table" },
      { id: "signature", roles: ["Comprador"], type: "signature" },
    ] satisfies DocumentTemplateBlock[];

    const { container } = render(
      <DocumentBuilderBlocks
        blocks={blocks}
        isEditable={false}
        onBlocksChange={vi.fn()}
        variables={[]}
      />,
    );

    for (const block of blocks) {
      expect(
        container.querySelector(`[data-block-type="${block.type}"]`),
      ).toBeInTheDocument();
    }
  });
});
