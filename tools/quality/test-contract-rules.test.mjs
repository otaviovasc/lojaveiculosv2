import { describe, expect, it } from "vitest";
import {
  findDisabledTestViolations,
  findTautologicalAssertionViolations,
  findWorkspaceTestViolations,
  isTestFile,
} from "./test-contract-rules.mjs";

describe("test contracts", () => {
  it("rejects focused, skipped, and todo tests", () => {
    const source = [
      "test.only('focused', () => {});",
      "describe.concurrent.skip('disabled', () => {});",
      "it.todo('later');",
      "xit('legacy', () => {});",
      "test.each([1, 2]).only('focused table', () => {});",
    ].join("\n");

    expect(findDisabledTestViolations("example.test.ts", source)).toEqual([
      expect.objectContaining({ modifier: "only", line: 1 }),
      expect.objectContaining({ modifier: "skip", line: 2 }),
      expect.objectContaining({ modifier: "todo", line: 3 }),
      expect.objectContaining({ modifier: "xit", line: 4 }),
      expect.objectContaining({ modifier: "only", line: 5 }),
    ]);
  });

  it("allows conditional test selection and ordinary tests", () => {
    const source = [
      "describe.skipIf(!runLive)('live', () => {});",
      "test.runIf(hasDatabase)('db', () => {});",
      "it('always runs', () => {});",
    ].join("\n");

    expect(findDisabledTestViolations("example.test.ts", source)).toEqual([]);
  });

  it("ignores disabled-looking examples in comments and strings", () => {
    const source = [
      "// test.only('example', () => {});",
      "const docs = `describe.skip('example')`;",
      "it('runs', () => {});",
    ].join("\n");

    expect(findDisabledTestViolations("example.test.ts", source)).toEqual([]);
  });

  it("rejects equality assertions between identical primitive literals", () => {
    const source = [
      "expect(true).toBe(true);",
      "expect('same').toEqual(`same`);",
      "expect((-42)).toStrictEqual(-42);",
      "expect(null).toBe(null);",
      "expect(12n)['toEqual'](12n);",
      "expect.soft(false).toBe(false);",
    ].join("\n");

    expect(
      findTautologicalAssertionViolations("example.test.ts", source),
    ).toEqual([
      { line: 1, matcher: "toBe" },
      { line: 2, matcher: "toEqual" },
      { line: 3, matcher: "toStrictEqual" },
      { line: 4, matcher: "toBe" },
      { line: 5, matcher: "toEqual" },
      { line: 6, matcher: "toBe" },
    ]);
  });

  it("allows assertions that can observe application behavior", () => {
    const source = [
      "expect(result).toBe(true);",
      "expect(getValue()).toEqual('same');",
      "expect(1).not.toBe(2);",
      "expect({ value: 1 }).toEqual({ value: 1 });",
      "expect(1).toBe(2);",
      "// expect(true).toBe(true);",
      "const docs = `expect('same').toEqual('same')`;",
    ].join("\n");

    expect(
      findTautologicalAssertionViolations("example.test.ts", source),
    ).toEqual([]);
  });

  it("requires runtime workspaces to expose and contain real tests", () => {
    const failures = workspaceViolations({ scripts: {} }, []);
    expect(failures).toEqual([
      "packages/example/package.json: runtime workspace must expose scripts.test",
      "packages/example/package.json: runtime workspace must contain a test/spec file",
    ]);
  });

  it("requires assertion counting for every runtime workspace", () => {
    expect(
      findWorkspaceTestViolations({
        packageFile: "packages/example/package.json",
        packageSource: JSON.stringify({ scripts: { test: "vitest run" } }),
        requireAssertions: false,
        runtimeFiles: ["src/index.ts"],
        testFiles: ["src/index.test.ts"],
      }),
    ).toEqual([
      "packages/example/package.json: Vitest must require at least one assertion per test",
    ]);
  });

  it("rejects placeholder and pass-with-no-tests scripts", () => {
    expect(
      workspaceViolations({ scripts: { test: "echo ok" } }, ["x.test.ts"]),
    ).toEqual([
      "packages/example/package.json: test script must run a real test runner",
      "packages/example/package.json: test script must use a supported test runner",
    ]);
    expect(
      workspaceViolations(
        { scripts: { test: "vitest run --passWithNoTests" } },
        ["x.test.ts"],
      ),
    ).toEqual([
      "packages/example/package.json: test script must not use --passWithNoTests",
    ]);
  });

  it("rejects focused workspace test commands", () => {
    expect(
      workspaceViolations({ scripts: { test: "vitest run src/one.test.ts" } }, [
        "src/one.test.ts",
        "src/two.test.ts",
      ]),
    ).toEqual([
      "packages/example/package.json: test script must not focus a test subset",
    ]);
  });

  it("recognizes supported test file extensions", () => {
    expect(isTestFile("src/example.test.tsx")).toBe(true);
    expect(isTestFile("src/example.spec.mjs")).toBe(true);
    expect(isTestFile("src/testSupport.ts")).toBe(false);
  });
});

function workspaceViolations(manifest, testFiles) {
  return findWorkspaceTestViolations({
    packageFile: "packages/example/package.json",
    packageSource: JSON.stringify(manifest),
    requireAssertions: true,
    runtimeFiles: ["src/index.ts"],
    testFiles,
  });
}
