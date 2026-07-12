import { describe, expect, it } from "vitest";
import { findWebUiContractViolations } from "./web-ui-contract-rules.mjs";

describe("web UI contract rules", () => {
  it("detects native and unsafe JSX across static expression forms", () => {
    const source = [
      "<select><option /></select>;",
      '<input type={"date"} />;',
      "<div dangerouslySetInnerHTML={{ __html: body }} />;",
      "<a href={`javascript:alert(1)`}>unsafe</a>;",
    ].join("\n");

    expect(kinds(source)).toEqual([
      "native-select",
      "native-date-input",
      "dangerous-html",
      "javascript-href",
    ]);
  });

  it("detects browser warnings through supported global access forms", () => {
    const source = [
      "alert('a');",
      "window['confirm']('b');",
      "globalThis.prompt('c');",
    ].join("\n");

    expect(kinds(source)).toEqual([
      "native-warning",
      "native-warning",
      "native-warning",
    ]);
  });

  it("ignores forbidden-looking text in comments and literals", () => {
    const source = [
      "// <select><option /></select>",
      'const docs = "window.alert( danger )";',
      'const markup = `<a href="javascript:alert(1)">` ;',
    ].join("\n");

    expect(kinds(source)).toEqual([]);
  });

  it("allows shared primitives and dynamic safe hrefs", () => {
    const source = [
      "<FeatureSelect />;",
      "<DatePickerField />;",
      "<a href={safeHref}>safe</a>;",
    ].join("\n");

    expect(kinds(source)).toEqual([]);
  });

  it("detects colored shadows on static button states but allows them on interactive prefixes", () => {
    const source = [
      "<button className='shadow-[0_4px_12px_rgba(255,0,0,0.5)]'>Click</button>;",
      "<Button className='shadow-[0_4px_12px_color-mix(in_srgb,red,transparent)]'>Click</Button>;",
      "<button className='hover:shadow-[0_4px_12px_rgba(255,0,0,0.5)] active:shadow-[#ff0000]'>Click</button>;",
      "<div className='shadow-[0_4px_12px_rgba(255,0,0,0.5)]'>Not a button</div>;",
    ].join("\n");

    expect(kinds(source)).toEqual([
      "button-color-shadow",
      "button-color-shadow",
    ]);
  });
});

function kinds(source) {
  return findWebUiContractViolations("Example.tsx", source).map(
    (item) => item.kind,
  );
}
