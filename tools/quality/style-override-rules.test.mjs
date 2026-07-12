import { describe, expect, it } from "vitest";
import { findStyleOverrideViolations } from "./style-override-rules.mjs";

describe("style override rules", () => {
  it("detects padding overrides on UI primitives", () => {
    const source = `
      import { Button } from "@/components/ui/button";
      export function Page() {
        return (
          <div>
            <Button className="p-4">Click me</Button>
            <Button className="px-[12px] py-1">Click me</Button>
          </div>
        );
      }
    `;

    const violations = findStyleOverrideViolations("Page.tsx", source);
    expect(violations).toHaveLength(3);
    expect(violations[0].kind).toBe("padding");
    expect(violations[0].cls).toBe("p-4");
    expect(violations[1].cls).toBe("px-[12px]");
    expect(violations[2].cls).toBe("py-1");
  });

  it("detects border radius overrides on UI primitives", () => {
    const source = `
      import { Badge } from "@/components/ui/badge";
      export function Page() {
        return (
          <div>
            <Badge className="rounded-none">Badge</Badge>
            <Badge className="rounded-[4px]">Badge</Badge>
          </div>
        );
      }
    `;

    const violations = findStyleOverrideViolations("Page.tsx", source);
    expect(violations).toHaveLength(2);
    expect(violations[0].kind).toBe("border-radius");
    expect(violations[0].cls).toBe("rounded-none");
    expect(violations[1].cls).toBe("rounded-[4px]");
  });

  it("allows standard class names without overrides", () => {
    const source = `
      import { Button } from "@/components/ui/button";
      export function Page() {
        return (
          <div>
            <Button className="w-full text-left font-normal border-rose-500">Click me</Button>
          </div>
        );
      }
    `;

    const violations = findStyleOverrideViolations("Page.tsx", source);
    expect(violations).toHaveLength(0);
  });

  it("detects aliased primitives and responsive override variants", () => {
    const source = `
      import { Button as Action } from "@/components/ui/button";
      export function Page() {
        return <Action className="sm:hover:!px-2 rounded-[var(--radius-sm)]" />;
      }
    `;

    expect(findStyleOverrideViolations("Page.tsx", source)).toEqual([
      expect.objectContaining({ cls: "sm:hover:!px-2", kind: "padding" }),
      expect.objectContaining({
        cls: "rounded-[var(--radius-sm)]",
        kind: "border-radius",
      }),
    ]);
  });

  it("detects namespace imports and static classes inside helpers", () => {
    const source = `
      import * as UI from "@/components/ui";
      export function Page({ compact }) {
        return <UI.Input className={cn("px-2", compact && "rounded-sm")} />;
      }
    `;

    expect(findStyleOverrideViolations("Page.tsx", source)).toHaveLength(2);
  });

  it("ignores non-UI component tags", () => {
    const source = `
      export function Page() {
        return (
          <div className="p-4 rounded-lg">
            <span className="p-2 rounded">Text</span>
          </div>
        );
      }
    `;

    const violations = findStyleOverrideViolations("Page.tsx", source);
    expect(violations).toHaveLength(0);
  });

  it("ignores local components that only share a primitive name", () => {
    const source = `
      function Button(props) {
        return <button {...props} />;
      }
      export function Page() {
        return <Button className="p-4 rounded-lg" />;
      }
    `;

    expect(findStyleOverrideViolations("Page.tsx", source)).toEqual([]);
  });

  it("exempts components inside components/ui folder", () => {
    const source = `
      export function Button({ className }) {
        return <button className="p-4 rounded-lg" />;
      }
    `;

    const violations = findStyleOverrideViolations(
      "apps/web/src/components/ui/button.tsx",
      source,
    );
    expect(violations).toHaveLength(0);
  });
});
