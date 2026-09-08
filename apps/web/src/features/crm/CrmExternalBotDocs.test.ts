import { describe, expect, it } from "vitest";
import { externalBotActionRegistry } from "@lojaveiculosv2/shared";
import { botActionExamples } from "./CrmExternalBotActionExamplesData";
import { actionGroups } from "./CrmExternalBotDocsData";

const registry = new Set<string>(externalBotActionRegistry);

describe("external bot docs drift guard", () => {
  it("documents only actions present in externalBotActionRegistry", () => {
    const documented = new Set<string>();

    for (const group of actionGroups) {
      for (const name of group.actions.split(",")) {
        documented.add(name.trim());
      }
    }
    for (const example of botActionExamples) {
      const parsed = JSON.parse(example.code) as {
        command?: { action?: string };
      };
      if (example.code.includes('"command"')) {
        expect(parsed.command?.action).toBeDefined();
        documented.add(parsed.command!.action!);
      }
    }

    for (const name of documented) {
      expect(registry.has(name), `unknown bot action in docs: ${name}`).toBe(
        true,
      );
    }
  });

  it("covers every registry action in a group", () => {
    const grouped = actionGroups.flatMap((group) =>
      group.actions.split(",").map((name) => name.trim()),
    );
    for (const action of externalBotActionRegistry) {
      expect(grouped, `registry action missing from docs: ${action}`).toContain(
        action,
      );
    }
  });
});
