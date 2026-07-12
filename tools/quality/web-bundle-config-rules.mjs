import {
  expressionPath,
  parseTypeScriptSource,
  propertyNameText,
  staticString,
  ts,
  unwrapExpression,
  walkTypeScript,
} from "./typescript-source.mjs";

const expectedStaticExtensions = [
  ".gif",
  ".html",
  ".ico",
  ".jpeg",
  ".jpg",
  ".json",
  ".pdf",
  ".png",
  ".svg",
  ".ttf",
  ".txt",
  ".webmanifest",
  ".webp",
  ".woff",
  ".woff2",
  ".xml",
];

const establishedBudgetCeilings = {
  javascript: 580_000,
  stylesheet: 645_000,
  worker: 1_075_000,
};

export function findWebBundleConfigViolations(input) {
  return [
    ...findPolicyViolations(input.policy),
    ...findViteConfigViolations(input.viteConfigSource),
    ...findScriptViolations(input.rootScripts, input.webScripts),
  ];
}

function findPolicyViolations(policy) {
  const failures = [];
  expectEqual(policy.outputDirectory, "apps/web/dist", "outputDirectory");
  expectEqual(
    policy.manifestRelativePath,
    ".vite/manifest.json",
    "manifestRelativePath",
  );
  expectBudget(policy.limits?.javascript, "javascript");
  expectBudget(policy.limits?.stylesheet, "stylesheet");

  const workers = policy.workerExceptions;
  if (!Array.isArray(workers) || workers.length !== 1) {
    failures.push("policy must define exactly one reviewed worker exception");
  } else {
    const worker = workers[0];
    expectEqual(worker.id, "pdf-worker", "worker exception id");
    expectEqual(
      worker.pattern,
      "^assets/pdf\\.worker\\.min-[A-Za-z0-9_-]+\\.mjs$",
      "pdf worker pattern",
    );
    expectBudget(worker.maxBytes, "worker");
    try {
      new RegExp(worker.pattern);
    } catch {
      failures.push("pdf worker pattern must be a valid regular expression");
    }
  }

  if (
    JSON.stringify(policy.staticExtensions) !==
    JSON.stringify(expectedStaticExtensions)
  ) {
    failures.push(
      "staticExtensions must match the reviewed non-code allowlist",
    );
  }
  return failures;

  function expectBudget(value, kind) {
    if (!Number.isInteger(value) || value <= 0) {
      failures.push(`${kind} budget must be a positive integer byte count`);
    } else if (value > establishedBudgetCeilings[kind]) {
      failures.push(
        `${kind} budget must not exceed ${establishedBudgetCeilings[kind]} bytes`,
      );
    }
  }

  function expectEqual(actual, expected, label) {
    if (actual !== expected) failures.push(`${label} must be ${expected}`);
  }
}

function findViteConfigViolations(source) {
  const file = "apps/web/vite.config.ts";
  const sourceFile = parseTypeScriptSource(file, source);
  const failures = [];
  let policyBinding = null;
  const configObjects = [];

  walkTypeScript(sourceFile, (node) => {
    if (
      ts.isImportDeclaration(node) &&
      staticString(node.moduleSpecifier) ===
        "../../tools/quality/web-bundle-policy.json"
    ) {
      policyBinding = node.importClause?.name?.text ?? null;
    }
    if (
      ts.isCallExpression(node) &&
      expressionPath(node.expression) === "defineConfig"
    ) {
      const argument = unwrapExpression(node.arguments[0]);
      if (argument && ts.isObjectLiteralExpression(argument)) {
        configObjects.push(argument);
      }
    }
  });

  if (!policyBinding) {
    failures.push(`${file}: must default-import the bundle policy JSON`);
    return failures;
  }
  if (configObjects.length !== 1) {
    failures.push(`${file}: must export one static defineConfig object`);
    return failures;
  }

  const build = requireObject(configObjects[0], "build", "defineConfig");
  if (!build) return failures;
  expectBoolean(build, "emptyOutDir", true);
  expectBoolean(build, "manifest", true);
  expectString(build, "outDir", "dist");
  expectBoolean(build, "reportCompressedSize", true);

  const warningLimit = requireProperty(build, "chunkSizeWarningLimit", "build");
  const warningExpression = warningLimit && unwrapExpression(warningLimit);
  const validWarningExpression =
    warningExpression &&
    ts.isBinaryExpression(warningExpression) &&
    warningExpression.operatorToken.kind === ts.SyntaxKind.SlashToken &&
    expressionPath(warningExpression.left) ===
      `${policyBinding}.limits.javascript` &&
    ts.isNumericLiteral(unwrapExpression(warningExpression.right)) &&
    Number(unwrapExpression(warningExpression.right).text) === 1_000;
  if (!validWarningExpression) {
    failures.push(
      `${file}: build.chunkSizeWarningLimit must derive from the byte policy`,
    );
  }

  const rolldown = requireObject(build, "rolldownOptions", "build");
  const output =
    rolldown && requireObject(rolldown, "output", "rolldownOptions");
  if (output) expectBoolean(output, "codeSplitting", true);

  walkTypeScript(build, (node) => {
    if (!ts.isPropertyAssignment(node)) return;
    const name = propertyNameText(node.name);
    if (
      ["advancedChunks", "inlineDynamicImports", "manualChunks"].includes(name)
    ) {
      failures.push(`${file}: build must not use deprecated ${name}`);
    }
  });
  return failures;

  function expectBoolean(object, name, expected) {
    const value = requireProperty(object, name, "build");
    if (
      value?.kind !==
      (expected ? ts.SyntaxKind.TrueKeyword : ts.SyntaxKind.FalseKeyword)
    ) {
      failures.push(`${file}: build.${name} must remain ${expected}`);
    }
  }

  function expectString(object, name, expected) {
    const value = requireProperty(object, name, "build");
    if (staticString(value) !== expected) {
      failures.push(`${file}: build.${name} must be ${expected}`);
    }
  }

  function requireObject(object, name, parent) {
    const value = requireProperty(object, name, parent);
    const current = value && unwrapExpression(value);
    if (!current || !ts.isObjectLiteralExpression(current)) {
      failures.push(`${file}: ${parent}.${name} must be a static object`);
      return null;
    }
    return current;
  }

  function requireProperty(object, name, parent) {
    const matches = object.properties.filter(
      (property) =>
        ts.isPropertyAssignment(property) &&
        propertyNameText(property.name) === name,
    );
    if (matches.length !== 1) {
      failures.push(`${file}: ${parent}.${name} must be defined exactly once`);
      return null;
    }
    return matches[0].initializer;
  }
}

function findScriptViolations(rootScripts, webScripts) {
  const expected = {
    "build:deployables":
      "pnpm --filter @lojaveiculosv2/web build && pnpm run verify:web-bundle && pnpm --filter @lojaveiculosv2/api build",
    "check:web-bundle": "node tools/quality/check-web-bundle.mjs",
    "verify:web-bundle": "node tools/quality/verify-web-bundle-artifacts.mjs",
  };
  const failures = [];
  for (const [name, command] of Object.entries(expected)) {
    if (rootScripts[name] !== command) {
      failures.push(`${name} must be ${JSON.stringify(command)}`);
    }
  }
  if (webScripts.build !== "tsc -b && vite build") {
    failures.push('apps/web build must be "tsc -b && vite build"');
  }
  return failures;
}
