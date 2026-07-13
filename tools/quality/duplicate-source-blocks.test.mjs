import { describe, expect, it } from "vitest";
import { findFunctionBlocks } from "./duplicate-source-blocks.mjs";

describe("duplicate source block discovery", () => {
  it("parses typed React functions with callback props", () => {
    const blocks = findFunctionBlocks(
      `
        export function SaleDialog({ onClose }: { onClose: () => void }) {
          const close = () => onClose();
          return <Dialog onClose={close}>Sale</Dialog>;
        }
      `,
      "SaleDialog.tsx",
    );

    expect(blocks).toEqual([
      expect.objectContaining({ name: "SaleDialog" }),
      expect.objectContaining({ name: "close" }),
    ]);
    expect(blocks[0].body).toContain("return <Dialog");
  });

  it("discovers expression arrows, methods, and wrapped callbacks", () => {
    const blocks = findFunctionBlocks(
      `
        const label = (value: string) => value.trim();
        const Panel = memo(() => <section>Panel</section>);
        class Formatter {
          format(value: string) { return value.toUpperCase(); }
        }
      `,
      "Patterns.tsx",
    );

    expect(blocks.map(({ name }) => name)).toEqual([
      "label",
      "Panel",
      "format",
    ]);
    expect(blocks.find(({ name }) => name === "label")?.body).toBe(
      "value.trim()",
    );
  });

  it("discovers nested callable wrappers", () => {
    const blocks = findFunctionBlocks(
      `
        const Panel = React.memo(
          React.forwardRef<HTMLDivElement, Props>((props, ref) => (
            <section ref={ref}>{props.label}</section>
          )),
        );
      `,
      "NestedPanel.tsx",
    );

    expect(blocks).toEqual([expect.objectContaining({ name: "Panel" })]);
    expect(blocks[0].body).toContain("<section ref={ref}");
  });

  it("does not mistake collection callbacks for callable values", () => {
    const blocks = findFunctionBlocks(
      `
        const sortedStores = stores
          .filter((store) => store.active)
          .sort((left, right) => left.name.localeCompare(right.name));
        const activeIds = stores.map((store) => store.id);
      `,
      "storeCollections.ts",
    );

    expect(blocks).toEqual([]);
  });
});
