import { describe, expect, it } from "vitest";
import {
  findBaseTsconfigViolations,
  findDeployableBuildViolations,
  findEslintContractViolations,
  findSuppressionCommentViolations,
  findWorkspaceTsconfigViolations,
  requiredCompilerOptions,
  requiredEslintRules,
} from "./toolchain-contract-rules.mjs";

describe("toolchain contracts", () => {
  it("requires every strict base compiler option", () => {
    const validOptions = Object.fromEntries(
      requiredCompilerOptions.map((option) => [option, true]),
    );
    expect(
      findBaseTsconfigViolations("tsconfig.base.json", json(validOptions)),
    ).toEqual([]);

    validOptions.strict = false;
    expect(
      findBaseTsconfigViolations("tsconfig.base.json", json(validOptions)),
    ).toContain("tsconfig.base.json: compilerOptions.strict must remain true");
  });

  it("rejects workspace overrides that weaken the root contract", () => {
    const source = JSON.stringify({
      extends: "../../tsconfig.base.json",
      compilerOptions: { noUncheckedIndexedAccess: false },
      include: ["src/**/*.ts"],
    });
    expect(
      findWorkspaceTsconfigViolations(
        "/repo/apps/api/tsconfig.json",
        source,
        "/repo",
      ),
    ).toEqual([
      "/repo/apps/api/tsconfig.json: must not weaken compilerOptions.noUncheckedIndexedAccess",
    ]);
  });

  it("requires workspace source globs and the root base config", () => {
    const source = JSON.stringify({ extends: "./local.json", include: [] });
    expect(
      findWorkspaceTsconfigViolations(
        "/repo/packages/shared/tsconfig.json",
        source,
        "/repo",
      ),
    ).toEqual([
      "/repo/packages/shared/tsconfig.json: must extend the root tsconfig.base.json",
      "/repo/packages/shared/tsconfig.json: must include runtime or test source globs",
    ]);
  });

  it("protects deployable production build commands", () => {
    expect(
      findDeployableBuildViolations(
        "apps/api/package.json",
        JSON.stringify({ scripts: { build: "tsc -b" } }),
        "tsc -b",
      ),
    ).toEqual([]);
    expect(
      findDeployableBuildViolations(
        "apps/api/package.json",
        JSON.stringify({ scripts: { build: "echo skipped" } }),
        "tsc -b",
      ),
    ).toEqual(['apps/api/package.json: scripts.build must be "tsc -b"']);
  });

  it("requires typed ESLint parsing and critical error rules", () => {
    const rules = requiredEslintRules
      .map((rule) => `${JSON.stringify(rule)}: "error"`)
      .join(",");
    const valid = `export default tseslint.config({ languageOptions: { parser: tseslint.parser, parserOptions: { projectService: true } }, rules: { ${rules} } });`;
    expect(findEslintContractViolations("eslint.config.js", valid)).toEqual([]);

    const weakened = valid.replace(
      '"@typescript-eslint/no-explicit-any": "error"',
      '"@typescript-eslint/no-explicit-any": "off"',
    );
    expect(
      findEslintContractViolations("eslint.config.js", weakened),
    ).toContain(
      "eslint.config.js: @typescript-eslint/no-explicit-any must remain configured as error",
    );
  });

  it("cannot be satisfied by marker text in comments", () => {
    const source = [
      "// parser: tseslint.parser, projectService: true",
      "// '@typescript-eslint/no-explicit-any': 'error'",
      "export default [];",
    ].join("\n");
    const failures = findEslintContractViolations("eslint.config.js", source);
    expect(failures).toContain("eslint.config.js: must retain tseslint.parser");
    expect(failures).toContain(
      "eslint.config.js: must use tseslint.config(...)",
    );
    expect(failures).toHaveLength(requiredEslintRules.length + 3);
  });

  it("rejects type and lint bypass comments without matching string literals", () => {
    const source = [
      "const example = '// eslint-disable-next-line';",
      "// @ts-ignore",
      "unsafeCall();",
      "/* eslint-disable */",
    ].join("\n");

    expect(findSuppressionCommentViolations("source.ts", source)).toEqual([
      { file: "source.ts", line: 2, marker: "@ts-ignore" },
      { file: "source.ts", line: 4, marker: "eslint-disable" },
    ]);
  });
});

function json(compilerOptions) {
  return JSON.stringify({ compilerOptions });
}
