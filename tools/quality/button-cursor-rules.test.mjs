import { describe, expect, it } from "vitest";
import { findButtonCursorContractViolations } from "./button-cursor-rules.mjs";

describe("button cursor rules", () => {
  it("accepts the global enabled and disabled cursor contract", () => {
    expect(findButtonCursorContractViolations(validContract())).toEqual([]);
  });

  it("rejects a missing stylesheet import chain", () => {
    const input = validContract();
    input.mainSource = 'import "./app.css";';
    input.globalCss = '@import "./tokens.css";';

    expect(findButtonCursorContractViolations(input)).toEqual(
      expect.arrayContaining([
        "apps/web/src/main.tsx must import ./styles/global.css",
        "apps/web/src/styles/global.css must import ./button-cursors.css",
      ]),
    );
  });

  it("rejects cursor drift on enabled buttons", () => {
    const input = validContract();
    input.cursorCss = input.cursorCss.replace(
      "cursor: pointer !important",
      "cursor: auto",
    );

    expect(findButtonCursorContractViolations(input)).toEqual(
      expect.arrayContaining([
        'button:not(:disabled):not([aria-disabled="true"]) must declare cursor: pointer !important',
        '[role="button"]:not(button):not([aria-disabled="true"]) must declare cursor: pointer !important',
      ]),
    );
  });

  it("rejects cursor drift on disabled buttons", () => {
    const input = validContract();
    input.cursorCss = input.cursorCss.replace(
      "cursor: not-allowed !important",
      "cursor: pointer !important",
    );

    expect(findButtonCursorContractViolations(input)).toHaveLength(3);
  });
});

function validContract() {
  return {
    cursorCss: `
      button:not(:disabled):not([aria-disabled="true"]),
      [role="button"]:not(button):not([aria-disabled="true"]) {
        cursor: pointer !important;
      }

      button:disabled,
      button[aria-disabled="true"],
      [role="button"][aria-disabled="true"] {
        cursor: not-allowed !important;
      }
    `,
    globalCss: '@import "./button-cursors.css";',
    mainSource: 'import "./styles/global.css";',
  };
}
