import { dirname, resolve } from "node:path";
import {
  expressionPath,
  parseTypeScriptSource,
  propertyNameText,
  staticString,
  ts,
  unwrapExpression,
  walkTypeScript,
} from "./typescript-source.mjs";

export const requiredCompilerOptions = [
  "exactOptionalPropertyTypes",
  "forceConsistentCasingInFileNames",
  "isolatedModules",
  "noEmit",
  "noFallthroughCasesInSwitch",
  "noImplicitOverride",
  "noImplicitReturns",
  "noUncheckedIndexedAccess",
  "strict",
  "useDefineForClassFields",
];

export const requiredEslintRules = [
  "@typescript-eslint/consistent-type-imports",
  "@typescript-eslint/no-explicit-any",
  "@typescript-eslint/no-floating-promises",
  "@typescript-eslint/no-misused-promises",
  "@typescript-eslint/switch-exhaustiveness-check",
  "@typescript-eslint/no-unsafe-assignment",
  "@typescript-eslint/no-unsafe-member-access",
  "@typescript-eslint/no-unsafe-return",
];

export function findBaseTsconfigViolations(file, source) {
  const result = parseJsonConfig(file, source);
  if (result.error) return [result.error];
  const options = result.config.compilerOptions ?? {};
  return requiredCompilerOptions.flatMap((option) =>
    options[option] === true
      ? []
      : [`${file}: compilerOptions.${option} must remain true`],
  );
}

export function findWorkspaceTsconfigViolations(file, source, repoRoot) {
  const result = parseJsonConfig(file, source);
  if (result.error) return [result.error];
  const failures = [];
  const expectedBase = resolve(repoRoot, "tsconfig.base.json");
  const actualBase =
    typeof result.config.extends === "string"
      ? resolve(dirname(file), result.config.extends)
      : null;
  if (actualBase !== expectedBase) {
    failures.push(`${file}: must extend the root tsconfig.base.json`);
  }
  const options = result.config.compilerOptions ?? {};
  for (const option of requiredCompilerOptions) {
    if (option in options && options[option] !== true) {
      failures.push(`${file}: must not weaken compilerOptions.${option}`);
    }
  }
  if (
    !Array.isArray(result.config.include) ||
    result.config.include.length === 0
  ) {
    failures.push(`${file}: must include runtime or test source globs`);
  }
  return failures;
}

export function findDeployableBuildViolations(file, source, expectedBuild) {
  const result = parseJsonConfig(file, source);
  if (result.error) return [result.error];
  const actualBuild = result.config.scripts?.build;
  return actualBuild === expectedBuild
    ? []
    : [`${file}: scripts.build must be ${JSON.stringify(expectedBuild)}`];
}

export function findSuppressionCommentViolations(file, source) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    source,
  );
  const sourceFile = parseTypeScriptSource(file, source);
  const violations = [];
  for (
    let token = scanner.scan();
    token !== ts.SyntaxKind.EndOfFileToken;
    token = scanner.scan()
  ) {
    if (
      token !== ts.SyntaxKind.SingleLineCommentTrivia &&
      token !== ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      continue;
    }
    const marker = scanner
      .getTokenText()
      .match(
        /@ts-(?:ignore|nocheck|expect-error)\b|eslint-disable(?:-next-line|-line)?\b/,
      )?.[0];
    if (!marker) continue;
    const line =
      sourceFile.getLineAndCharacterOfPosition(scanner.getTokenPos()).line + 1;
    violations.push({ file, line, marker });
  }
  return violations;
}

export function findEslintContractViolations(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const ruleSeverities = new Map();
  const parserValues = [];
  const projectServiceValues = [];
  let configCalls = 0;

  walkTypeScript(sourceFile, (node) => {
    if (
      !ts.isCallExpression(node) ||
      expressionPath(node.expression) !== "tseslint.config"
    ) {
      return;
    }
    configCalls += 1;
    for (const argument of node.arguments) inspectConfigArgument(argument);
  });

  const failures = [];
  if (configCalls === 0)
    failures.push(`${file}: must use tseslint.config(...)`);
  if (
    parserValues.length === 0 ||
    parserValues.some((value) => value !== "tseslint.parser")
  ) {
    failures.push(`${file}: must retain tseslint.parser`);
  }
  if (
    projectServiceValues.length === 0 ||
    projectServiceValues.some((value) => value !== true)
  ) {
    failures.push(`${file}: parserOptions.projectService must remain true`);
  }
  for (const rule of requiredEslintRules) {
    if (ruleSeverities.get(rule) !== "error") {
      failures.push(`${file}: ${rule} must remain configured as error`);
    }
  }
  return failures;

  function inspectConfigArgument(argument) {
    const config = unwrapExpression(argument);
    if (!ts.isObjectLiteralExpression(config)) return;
    walkTypeScript(config, (node) => {
      if (!ts.isPropertyAssignment(node)) return;
      const name = propertyNameText(node.name);
      if (name === "parser") {
        parserValues.push(expressionPath(node.initializer));
      }
      if (name === "projectService") {
        projectServiceValues.push(
          node.initializer.kind === ts.SyntaxKind.TrueKeyword,
        );
      }
      if (name !== "rules") return;
      const rules = unwrapExpression(node.initializer);
      if (!ts.isObjectLiteralExpression(rules)) return;
      for (const property of rules.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const rule = propertyNameText(property.name);
        if (rule)
          ruleSeverities.set(rule, eslintSeverity(property.initializer));
      }
    });
  }
}

function parseJsonConfig(file, source) {
  const parsed = ts.parseConfigFileTextToJson(file, source);
  if (!parsed.error) return { config: parsed.config };
  return {
    error: `${file}: ${ts.flattenDiagnosticMessageText(parsed.error.messageText, " ")}`,
  };
}

function eslintSeverity(node) {
  const current = unwrapExpression(node);
  if (ts.isArrayLiteralExpression(current)) {
    return current.elements.length > 0
      ? eslintSeverity(current.elements[0])
      : null;
  }
  const text = staticString(current);
  if (text) return text;
  if (ts.isNumericLiteral(current))
    return current.text === "2" ? "error" : current.text;
  return null;
}
