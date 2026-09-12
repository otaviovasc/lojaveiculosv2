import { describe, expect, it } from "vitest";
import {
  analyzeJsxButtonShadows,
  collectActionClassNames,
  findCssButtonShadowViolations,
  findJsxButtonShadowViolations,
} from "./button-shadow-rules.mjs";

describe("button shadow rules", () => {
  it("rejects the colored CTA glow and its hover variant", () => {
    const source = `
      .documents-top-bar-action { box-shadow: 0 4px 12px rgba(225, 31, 38, 0.2); }
      .documents-top-bar-action:hover { box-shadow: 0 6px 18px rgba(225, 31, 38, 0.35); }
    `;

    expect(findCssButtonShadowViolations("actions.css", source)).toHaveLength(
      2,
    );
  });

  it("rejects neutral elevation and selected-state shadows on actions", () => {
    const source = `
      button { box-shadow: var(--shadow-panel); }
      .feature-tab.is-active { box-shadow: inset 3px 0 var(--color-accent); }
    `;

    expect(findCssButtonShadowViolations("actions.css", source)).toHaveLength(
      2,
    );
  });

  it("allows no shadow, the shared focus ring, and noninteractive surfaces", () => {
    const source = `
      .feature-action { box-shadow: none; }
      .feature-action:focus-visible { box-shadow: var(--shadow-focus); }
      .feature-row-action__tooltip { box-shadow: var(--shadow-raised); }
      .surface { box-shadow: var(--shadow-panel); }
    `;

    expect(findCssButtonShadowViolations("actions.css", source)).toEqual([]);
  });

  it("uses classes collected from intrinsic and shared action elements", () => {
    const tsx = `
      <button className="download-control">Download</button>;
      <FeatureActionButton className="primary-cta" label="Save" />;
    `;
    const classes = collectActionClassNames("Example.tsx", tsx);
    const css = `.primary-cta:hover { box-shadow: 0 2px 4px rgb(0 0 0 / .1); }`;

    expect(classes).toEqual(new Set(["download-control", "primary-cta"]));
    expect(
      findCssButtonShadowViolations("actions.css", css, classes),
    ).toHaveLength(1);
  });

  it("combines action discovery and JSX diagnostics without changing results", () => {
    const source = `
      <FeatureActionButton
        className={active ? "primary-cta hover:shadow-lg" : "secondary-cta"}
        style={{ boxShadow: "0 0 1rem red" }}
      />
    `;

    const result = analyzeJsxButtonShadows("Example.tsx", source);

    expect(result.actionClassNames).toEqual(
      new Set(["primary-cta", "shadow-lg", "secondary-cta"]),
    );
    expect(result.actionClassNames).toEqual(
      collectActionClassNames("Example.tsx", source),
    );
    expect(result.violations).toEqual(
      findJsxButtonShadowViolations("Example.tsx", source),
    );
    expect(result.violations).toEqual([
      {
        detail: 'decorative shadow class "hover:shadow-lg"',
        file: "Example.tsx",
        line: 3,
      },
      {
        detail: "inline style.boxShadow",
        file: "Example.tsx",
        line: 4,
      },
    ]);
  });

  it("rejects JSX shadow utilities in every decorative state", () => {
    const source = `
      <button className="shadow-sm hover:shadow-lg active:drop-shadow-md">Save</button>;
      <Button style={{ boxShadow: "0 0 1rem red" }}>Save</Button>;
    `;

    expect(findJsxButtonShadowViolations("Example.tsx", source)).toHaveLength(
      4,
    );
  });

  it("allows only shadow-none and the shared keyboard focus ring", () => {
    const source = `
      <button className="shadow-none focus-visible:shadow-[var(--shadow-focus)]">Save</button>;
    `;

    expect(findJsxButtonShadowViolations("Example.tsx", source)).toEqual([]);
  });
});
